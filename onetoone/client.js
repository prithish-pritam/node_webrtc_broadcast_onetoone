var divSelectRoom=document.getElementById('selectRoom');
var divConsultingRoom=document.getElementById('consultingRoom');
var inputRoomNumber=document.getElementById('roomNumber');
var btnGoRoom=document.getElementById("goRoom");
var localVideo=document.getElementById('localVideo');
var remoteVideo=document.getElementById('remoteVideo');

// Global variable
var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;

// STUN server declare;
var iceServers = {
    iceServers: [
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };

// Medai stream constrain
var streamConstraints = { audio: false, video: { height: 480 } };
var isCaller;

// Create socket connection
var socket= io();

// Declare Go Button event
btnGoRoom.onclick=function(){
    console.log("Button working");
    if(inputRoomNumber.value===''){
        alert("Please insert room number")
    }else{
        roomNumber=inputRoomNumber.value;
        socket.emit('create or join',roomNumber);
        divSelectRoom.style="display:none";
        divConsultingRoom.style="display:block";
    }
}

// message handler
socket.on("created",function(room){
    // caller get user media with stream constains
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream){
        localStream=stream;
        localVideo.srcObject=stream;
        isCaller=true;
    }).catch(err=>{
        console.log("Generated error in localStream",err);
    })
});

socket.on("joined",function(room){
    // caller get user media with stream constains
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream){
        localStream=stream;
        localVideo.srcObject=stream;
        socket.emit('ready',roomNumber);
    }).catch(err=>{
        console.log("Generated error in JoinStream",err);
    })
});
// when server emit is ready//
socket.on('ready',function(){
    if(isCaller){
        // create RTCPeerConnection Object//
        rtcPeerConnection= new RTCPeerConnection(iceServers);
        // add event listner to the newly created object
        rtcPeerConnection.onicecandidate=onIceCandidate;
        rtcPeerConnection.onaddstream=onAddStream;

        rtcPeerConnection.addStream(localStream);
        //prepare an offer
        rtcPeerConnection.createOffer(setLocalAndOffer,function(e){console.log(e)});

    }
});

// when server emit offer//
socket.on('offer',function(event){
    if(!isCaller){
        // create RTCPeerConnection Object//
        rtcPeerConnection= new RTCPeerConnection(iceServers);
        // add event listner to the newly created object
        rtcPeerConnection.onicecandidate=onIceCandidate;
        rtcPeerConnection.onaddstream=onAddStream;

        rtcPeerConnection.addStream(localStream);
        //store offer as remote description//
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        //Prepare as an answer
        rtcPeerConnection.createAnswer(setLocalAndAnswer,function(e){console.log(e)});
    }
});

//when server emit Answer//
socket.on('answer',function(event){
    //store is as remote descriotion
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

//when server emit candidate//
socket.on('candidate',function(event){
    // create a candidate object
    var candidate= new RTCIceCandidate({
        sdpMLineIndex:event.label,
        candidate:event.candidate
    });
    // store candidate
    rtcPeerConnection.addIceCandidate(candidate);
});

// when one user receive other user video and audio//
function onAddStream(event){
    remoteVideo.srcObject=event.stream;
    remoteStream=event.stream;
}

//send a candidate message to server//
function onIceCandidate(event){
    if(event.candidate){
        console.log("sending ice candidate");
        socket.emit('candidate',{
            type:'candidate',
            label:event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room:roomNumber
        })
    }
}

//stores offer and send message to server//
function setLocalAndOffer(sessionDescription){
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer',{
        type: 'offer',
        sdp: sessionDescription,
        room: roomNumber
    })
}

//store answer and send message to server
function setLocalAndAnswer(sessionDescription){
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer',{
        type: 'answer',
        sdp: sessionDescription,
        room: roomNumber
    })
}