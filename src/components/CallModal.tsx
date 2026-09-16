import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, User } from 'lucide-react';
import { UserProfile } from '../types';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CallModalProps {
  currentUser: UserProfile;
  contact: UserProfile;
  callId?: string; // If incoming or existing call
  isIncoming?: boolean;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  currentUser,
  contact,
  callId: initialCallId,
  isIncoming = false,
  onClose,
}) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'declined' | 'missed' | 'ended'>(
    isIncoming ? 'ringing' : 'ringing'
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [activeCallId, setActiveCallId] = useState<string | null>(initialCallId || null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubCallRef = useRef<(() => void) | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const STUN_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize WebRTC Peer Connection
  const setupPeerConnection = (callDocId: string, isCaller: boolean) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(STUN_CONFIG);
    pcRef.current = pc;

    // Get local microphone stream
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((err) => {
        console.warn('Microphone permission error or not allowed:', err);
      });

    // Handle remote audio stream
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((e) => console.log('Audio play notice:', e));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidateCol = collection(db, 'calls', callDocId, isCaller ? 'callerCandidates' : 'calleeCandidates');
        await addDoc(candidateCol, event.candidate.toJSON()).catch((e) => console.log('ICE notice:', e));
      }
    };

    if (isCaller) {
      // Create offer
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(async () => {
          await updateDoc(doc(db, 'calls', callDocId), {
            offer: { type: pc.localDescription?.type, sdp: pc.localDescription?.sdp },
          });
        })
        .catch((err) => console.warn('Offer creation error:', err));
    }

    // Listen for remote description and candidates
    const callRef = doc(db, 'calls', callDocId);
    unsubCallRef.current = onSnapshot(callRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      if (data.status === 'declined') {
        setCallState('declined');
        setTimeout(onClose, 2500);
      } else if (data.status === 'ended') {
        setCallState('ended');
        setTimeout(onClose, 2000);
      } else if (data.status === 'accepted') {
        setCallState('connected');
        if (!isCaller && data.offer && !pc.remoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateDoc(callRef, {
            answer: { type: answer.type, sdp: answer.sdp },
          });
        }
      }

      if (isCaller && data.answer && !pc.remoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // Listen for candidates
    const remoteCandidatesCol = collection(db, 'calls', callDocId, isCaller ? 'calleeCandidates' : 'callerCandidates');
    import('firebase/firestore').then(({ onSnapshot: snapCand }) => {
      snapCand(remoteCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            } catch (e) {
              console.warn('ICE candidate error:', e);
            }
          }
        });
      });
    });

    return pc;
  };

  // If caller, initiate call document in Firestore
  useEffect(() => {
    let callDocId = initialCallId;

    async function initCall() {
      if (!isIncoming && !callDocId) {
        try {
          const callRef = doc(collection(db, 'calls'));
          callDocId = callRef.id;
          setActiveCallId(callDocId);

          await setDoc(callRef, {
            callerId: currentUser.uid,
            callerName: currentUser.name,
            callerPhone: currentUser.phone || '',
            callerPhoto: currentUser.photoURL || '',
            calleeId: contact.uid,
            status: 'ringing',
            createdAt: new Date().toISOString(),
          });

          setupPeerConnection(callDocId, true);

          // 30s timeout for missed call
          ringTimeoutRef.current = setTimeout(async () => {
            if (callState === 'ringing') {
              setCallState('missed');
              await updateDoc(callRef, { status: 'missed' }).catch(() => {});
              setTimeout(onClose, 3000);
            }
          }, 30000);
        } catch (err) {
          console.warn('Call init error:', err);
        }
      } else if (isIncoming && callDocId) {
        setActiveCallId(callDocId);
      }
    }

    initCall();

    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (unsubCallRef.current) unsubCallRef.current();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Call duration timer when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const handleAcceptCall = async () => {
    if (!activeCallId) return;
    setCallState('connected');
    await updateDoc(doc(db, 'calls', activeCallId), { status: 'accepted' });
    setupPeerConnection(activeCallId, false);
  };

  const handleDeclineCall = async () => {
    if (activeCallId) {
      await updateDoc(doc(db, 'calls', activeCallId), { status: 'declined' }).catch(() => {});
    }
    setCallState('declined');
    setTimeout(onClose, 1500);
  };

  const handleEndCall = async () => {
    if (activeCallId) {
      await updateDoc(doc(db, 'calls', activeCallId), { status: 'ended' }).catch(() => {});
    }
    setCallState('ended');
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    }
    setIsMuted(!isMuted);
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a]/90 p-4 backdrop-blur-md">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      <div
        id="call-modal-container"
        className="relative flex h-full max-h-[480px] w-full max-w-sm flex-col items-center justify-between rounded-3xl bg-[#111b21] p-6 text-white shadow-2xl border border-[#222d34] overflow-hidden"
      >
        {/* Contact Info Header */}
        <div className="flex flex-col items-center text-center mt-6">
          <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full border-2 border-[#00a884]/40 bg-[#222d34] flex items-center justify-center text-3xl font-bold text-[#00a884] shadow-xl">
            {contact.photoURL ? (
              <img src={contact.photoURL} alt={contact.name} className="h-full w-full object-cover" />
            ) : (
              contact.name.charAt(0).toUpperCase()
            )}
            {callState === 'ringing' && (
              <span className="absolute inset-0 rounded-full border-2 border-[#00a884] animate-ping opacity-75" />
            )}
          </div>

          <h3 className="text-lg font-bold text-white">{contact.name}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{contact.phone || 'ভয়েস কল'}</p>
          
          <div className="mt-3 rounded-full bg-[#222d34] px-3.5 py-1 text-xs font-mono text-[#00a884]">
            {callState === 'ringing' && (isIncoming ? 'ইনকামিং ভয়েস কল...' : 'কল রিং হচ্ছে...')}
            {callState === 'connected' && formatSecs(callDuration)}
            {callState === 'declined' && 'কলটি রিজেক্ট করা হয়েছে'}
            {callState === 'missed' && 'মিসড কল'}
            {callState === 'ended' && 'কল শেষ হয়েছে'}
          </div>
        </div>

        {/* Incoming Call Accept / Decline or Active Controls */}
        <div className="w-full mb-4">
          {isIncoming && callState === 'ringing' ? (
            <div className="flex items-center justify-around w-full px-4">
              <button
                onClick={handleDeclineCall}
                className="flex flex-col items-center gap-1.5 p-3 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition cursor-pointer"
                title="ডিক্লাইন"
              >
                <PhoneOff className="h-6 w-6" />
                <span className="text-[10px] font-medium">কেটে দিন</span>
              </button>

              <button
                onClick={handleAcceptCall}
                className="flex flex-col items-center gap-1.5 p-3 rounded-full bg-[#00a884] text-white shadow-lg hover:bg-[#028b6d] transition cursor-pointer animate-bounce"
                title="রিসিভ করুন"
              >
                <Phone className="h-6 w-6" />
                <span className="text-[10px] font-medium">রিসিভ</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={toggleMute}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition cursor-pointer ${
                  isMuted ? 'bg-red-600 text-white' : 'bg-[#222d34] text-slate-200 hover:bg-[#2a3942]'
                }`}
                title={isMuted ? 'আনমিউট' : 'মিউট'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {/* End Call Button */}
              <button
                id="end-call-btn"
                onClick={handleEndCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 active:scale-95 transition cursor-pointer"
                title="কল শেষ করুন"
              >
                <PhoneOff className="h-6 w-6" />
              </button>

              <button
                onClick={() => setSpeakerOn(!speakerOn)}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition cursor-pointer ${
                  !speakerOn ? 'bg-slate-700 text-white' : 'bg-[#222d34] text-[#00a884] hover:bg-[#2a3942]'
                }`}
                title={speakerOn ? 'স্পিকার অন' : 'স্পিকার অফ'}
              >
                {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
