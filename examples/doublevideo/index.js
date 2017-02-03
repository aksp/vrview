/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var vrView;
var playButton;
var muteButton;

amyPlayer = {
  currentTime: 0,
  cuts: true,
};

function getIframedocument(){
    return $('iframe').eq(0)[0].contentWindow.document;
}

function onLoad() {
  // Load VR View.
  vrView = new VRView.Player('#vrview', {
    width: '100%',
    height: 480,
    video: '../video/cuts.mp4',
    is_stereo: false,
    //is_debug: true,
    //default_heading: 90,
    //is_yaw_only: true,
    //is_vr_off: true,
  });
  vrView.on('ready', onVRViewReady);

  playButton = document.querySelector('#toggleplay');
  muteButton = document.querySelector('#togglemute');

  playButton.addEventListener('click', onTogglePlay);
  muteButton.addEventListener('click', onToggleMute);

  $('#cuts').click(function(){
    $button = $(this);
    if (amyPlayer.cuts) {
      // we have cuts right now!
      
      // switch to no cuts
      var currentTime = amyPlayer.currentTime;
      vrView.setContent({video: "../video/nocuts.mp4"});
      setTimeout(function(){
        vrView.pause();
        vrView.seek(currentTime);
        vrView.play();
        $button.text("Switch back to cuts");
      }, 750);
      

      amyPlayer.cuts = false;
    } else {
      // switch to yes cuts
      var currentTime = amyPlayer.currentTime;
      vrView.setContent({video: "../video/cuts.mp4"}, function(){console.log("video loaded")});

      setTimeout(function(){
        vrView.pause();
        vrView.seek(currentTime);
        vrView.play();
        $button.text("Switch back to no cuts");
      }, 750);

      amyPlayer.cuts = true;
    }
  });

}

function listenForCurrentTime() {
  // we need to listen for events
  iframe = getIframedocument();
  iframe.addEventListener("currenttimeanswer" , function(e){
    // update that current time!
    amyPlayer.currentTime = e.detail;
    //console.log("currentTime is " + e.detail);
  });

  // but also we need to ask for it all of the time :(
  setInterval(function() {
    vrView.currentTime();
  }, 30);
}

function onVRViewReady() {
  console.log('vrView.isPaused', vrView.isPaused);
  // Set the initial state of the buttons.
  if (vrView.isPaused) {
    playButton.classList.add('paused');
  } else {
    playButton.classList.remove('paused');
  }

  listenForCurrentTime();
}

function onTogglePlay() {
  if (vrView.isPaused) {
    vrView.play();
    playButton.classList.remove('paused');
  } else {
    vrView.pause();
    playButton.classList.add('paused');
  }
}

function onToggleMute() {
  var isMuted = muteButton.classList.contains('muted');
  if (isMuted) {
    vrView.setVolume(1);
  } else {
    vrView.setVolume(0);
  }
  muteButton.classList.toggle('muted');
}

window.addEventListener('load', onLoad);
