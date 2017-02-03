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
var orientationButton;
var forcedcutsButton;
var subtitlesButton;

amyPlayer = {
  currentTime: 0,
  specs: {
    fn: "spec-files/nocuts-simple.json", 
    mode: "optional_cuts",
    subtitles: true,
    playback: null,
  },
};

function getIframedocument(){
    return $('iframe').eq(0)[0].contentWindow.document;
}

function createPlayer(video_fn) {
  // Load VR View.
  vrView = new VRView.Player('#vrview', {
    width: '100%',
    height: 480,
    video: video_fn,
    is_stereo: false,
    //is_debug: true,
    //default_heading: 90,
    //is_yaw_only: true,
    //is_vr_off: true,
  });
  vrView.on('ready', onVRViewReady);

  // define buttons and add event listeners
  playButton = document.querySelector('#toggleplay');
  muteButton = document.querySelector('#togglemute');
  orientationButton = document.querySelector('#toggleorientation');
  forcedcutsButton = document.querySelector('#toggleforcedcuts');
  subtitlesButton = document.querySelector('#togglesubtitles');

  playButton.addEventListener('click', onTogglePlay);
  muteButton.addEventListener('click', onToggleMute);
  orientationButton.addEventListener('click', onToggleOrientation);
  forcedcutsButton.addEventListener('click', onToggleForcedCuts);
  subtitlesButton.addEventListener('click', onToggleSubtitles);
}

function onLoad() {
  // load playback instructions
  if (amyPlayer.specs) {
    $.getJSON(amyPlayer.specs.fn, function( data ) {
      amyPlayer.specs.playback = data;

      // todo: create player that cuts between multiple videos
      if (amyPlayer.specs.playback.videos.length === 1) {
        var video_fn = amyPlayer.specs.playback.videos[0].fn;
        createPlayer(video_fn);
      }
    });
  }
}

function getPossibleOrientations(){
  if (amyPlayer.specs.playback !== null) {

    // get relevant orientation objects
    var res = $(amyPlayer.specs.playback.orientation).filter(function(){
      return this.start <= amyPlayer.currentTime 
          && this.end > amyPlayer.currentTime;
    });

    // for each relevant orientation object, append possible orientations
    var all_orientations = [];
    for (var i = 0; i < res.length; i++) {
      all_orientations = all_orientations.concat(res[i].orientations);
    };

    if (all_orientations && all_orientations.length > 0) {
      return all_orientations;
    } else {
      return null;
    }
  }
}

// force update the video player orientation
// to the first possible orientation
function updateOrientation(){
    var res = getPossibleOrientations();

    // if there are any possible orientations, we're just going 
    // to take the first one and trigger a cut
    if (res !== null && res[0] !== amyPlayer.current_orientation) {
      var first_orientation = res[0];
      vrView.setOrientation(first_orientation);
      amyPlayer.current_orientation = first_orientation;
    }
}

// update the options for the video player
// orientation, but only change the orientation when the user asks to
function updateOrientationOptions(){
  var res = getPossibleOrientations();

  // we're only going to update if the possible orientations have changed
  if (res !== null) {
    if (!amyPlayer.specs.possible_orientations 
      || amyPlayer.specs.possible_orientations.toString() !== res.toString()) {
      amyPlayer.specs.possible_orientations = res;
      amyPlayer.specs.next_orientation_i = 0;
    }
  }
}

function updateSubtitle() {
  // get relevant subtitles
  var res = $(amyPlayer.specs.playback.subtitles).filter(function(){
      return this.start <= amyPlayer.currentTime 
          && this.end > amyPlayer.currentTime;
  });

  if (res.length > 0 
      && res[0] 
      && res[0].text 
      && res[0].text !== amyPlayer.current_subtitle) {

    // remove existing subtitle if there is one
    if ( amyPlayer.current_subtitle ) {
      vrView.subtitle( amyPlayer.current_subtitle ) ;
      amyPlayer.current_subtitle = undefined ;
    }

    var subtitleText = res[0].text ;
    vrView.subtitle( subtitleText ); 
    amyPlayer.current_subtitle = subtitleText ;
  }
}

function listenForCurrentTime() {
  // we need to listen for events
  iframe = getIframedocument();
  iframe.addEventListener("currenttimeanswer" , function(e){
    // update that current time!
    amyPlayer.currentTime = e.detail;
    
    // also, update the orientation accordingly
    if (amyPlayer.specs.mode === "optional_cuts") {
      updateOrientationOptions();
    } else if (amyPlayer.specs.mode === "forced_cuts") {
      updateOrientation();
    }

    if (amyPlayer.specs.subtitles) {
      updateSubtitle();
    }
    
  });

  // but also we need to ask for it all of the time :(
  setInterval(function() {
    vrView.currentTime();
  }, 1000/29);
}

// first time play?
var firstTimePlay = true;
VIDEO_START_TIME = null;

function onVRViewReady() {
  vrView.pause();

  playButton.classList.add('paused');
  vrView.isPaused = true;

  console.log('vrView.isPaused', vrView.isPaused);
  // Set the initial state of the buttons.
  if (vrView.isPaused) {
    playButton.classList.add('paused');
  } else {
    playButton.classList.remove('paused');
  }
  listenForCurrentTime();
}

function onToggleOrientation() {
  var orientations = amyPlayer.specs.possible_orientations;
  var i = amyPlayer.specs.next_orientation_i;
  console.log(orientations);
  console.log(i);
  if (orientations.length > 0 && i !== undefined) {
    // set orientation to the next orientation
    vrView.setOrientation(orientations[i]); 

    // figure out the next orientation_i;
    if ( i + 1 < orientations.length ) {
      amyPlayer.specs.next_orientation_i = i + 1;
    } else {
      amyPlayer.specs.next_orientation_i = 0;
    }
  }
}

function onTogglePlay() {
  if (vrView.isPaused) {
    if (firstTimePlay) {
      var d = new Date();
      var time = d.getTime();

      VIDEO_START_TIME = time;
      firstTimePlay = false;
    }
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

function onToggleForcedCuts() {
  if (amyPlayer.specs.mode === "forced_cuts") {
    amyPlayer.specs.mode = "optional_cuts";
    $(forcedcutsButton).text("Switch to forced cuts");
    $(orientationButton).removeClass("disabled");
  } else if (amyPlayer.specs.mode === "optional_cuts"){
    amyPlayer.specs.mode = "forced_cuts";
    $(forcedcutsButton).text("Switch to optional cuts");
    $(orientationButton).addClass("disabled");
  }
}

function onToggleSubtitles() {
  if (amyPlayer.specs.subtitles) {
    $(subtitlesButton).text("Turn on subtitles");
    amyPlayer.specs.subtitles = false;
    vrView.subtitle(amyPlayer.current_subtitle);
  } else {
    $(subtitlesButton).text("Turn off subtitles");
    amyPlayer.specs.subtitles = true;
  }
}

window.addEventListener('load', onLoad);
