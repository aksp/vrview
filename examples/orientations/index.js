// Based on the example in ../video/ and edited heavily

var vrView;
var playButton;
var muteButton;
var orientationButton;
var forcedcutsButton;
var subtitlesButton;

// player settings
playerSts = {
  currentTime: 0,
  specs: { // specifications for playback
    fn: null,
    mode: "optional_cuts",
    subtitles: true,
    playback: null,
  },
  timeline: null,
  boundaries: null,
  $spec_composer: $('#spec-composer'),
};

function onSliderChange() {
  var value = playerSts.timeline.slider("value");
  vrView.seek(value/1000.0);
}

function updateTimeline() {
  playerSts.timeline.slider("value", playerSts.currentTime * 1000.0);
}

function addOrientationChange(time) {
  var sc = playerSts.$spec_composer;
  if (sc.is(":visible")) {
     var new_text = sc.val() + "\n" + time;
     sc.val(new_text);
  } else {
    sc.show();
    sc.val(time);
  }
}

function outputNewSpec() {

  var sc_text = playerSts.$spec_composer.val();
  var sc_text_arr = sc_text.split("\n");
  var out = {"subtitles": [], "orientation": [], "videos": []};
  var titles_times = [];

  for (var i = 0; i < sc_text_arr.length; i++) {
    var els = sc_text_arr[i].split(" ");
    if (els.length > 0) {
      var start = els[0];
      var text = els.splice(1,els.length);
      titles_times.push([start,text]);
    }
  };

  function addToOut(tt1, tt2) {

    var start = parseFloat(tt1[0]);
    var end = parseFloat(tt2[0]);
    var text;

    if (tt1.length > 1) {
      text = tt1[1].join(" ");
      out.subtitles.push({
        start: start,
        end: end,
        text: text
      });
    } 

    out.orientation.push({
      start: start,
      end: end,
      orientations: [], // TODO: create output for orientations
    });

  }

  for (var i = 0; i < titles_times.length - 1; i++) {

    addToOut(titles_times[i], titles_times[i+1]);

  };

  out.videos.push({
      fn: playerSts.specs.video_fn,
      stereo: playerSts.specs.stereo
  });

  addToOut(titles_times[titles_times.length - 1], [playerSts.specs.duration]);

}

function setTimelineKeycodes() {
  $(document).on("keypress", function(e){
    var k = e.keyCode;

    // if you've pressed space
    if (k === 32 && e.target == document.body) {

      e.preventDefault();
      onTogglePlay();

    // if you've pressed o or s
    } else if ( k === 111 && $(e.target).attr("id") !== "spec-composer") {
        addOrientationChange(playerSts.currentTime);

    // you've pressed s
    } else if (k === 115 && $(e.target).attr("id") !== "spec-composer") {
       outputNewSpec();
    }

  });
}

function setupTimeline(video_fn) {

  $('#fake-video-player').hide();
  $('#fake-video-player').html('<video src=' + video_fn + ' preload="metadata"></video>');
  $('#fake-video-player').find("video").eq(0).on("durationchange", function(){
    var seconds = $(this)[0].duration;
    playerSts.specs.duration = seconds; 

    console.log("Video duration: " + seconds);

    // setup slider with this duration
    var ms = seconds * 1000;
    $('#slider').slider({
      max: ms,
      slide: onSliderChange
    });

    playerSts.timeline = $('#slider');
    $('#fake-video-player').remove();

    setTimelineKeycodes();
  });
}

function getIframedocument(){
    return $('iframe').eq(0)[0].contentWindow.document;
}

function createPlayer(video_fn, stereo) {
  // Load VR View.
  vrView = new VRView.Player('#vrview', {
    width: '100%',
    height: 480,
    video: video_fn,
    is_stereo: stereo ? true : false,
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
  var url = window.location.href; 
  var q = url.split("?f=");
  playerSts.specs.fn = q[q.length-1];

  // load playback instructions if there is a spec json
  if ( playerSts.specs.fn && playerSts.specs.fn.toLowerCase().indexOf(".json") > -1) {
    $.getJSON(playerSts.specs.fn, function( data ) {
      playerSts.specs.playback = data;

      // todo: create player that cuts between multiple videos
      if (playerSts.specs.playback.videos.length === 1) {
        var video_fn = playerSts.specs.playback.videos[0].fn;
        var stereo = playerSts.specs.playback.videos[0].stereo;

        playerSts.specs.video_fn = video_fn;
        playerSts.specs.stereo = stereo;

        createPlayer(video_fn, stereo);
      }
    });
  } else if (playerSts.specs.fn 
          && playerSts.specs.fn.toLowerCase().indexOf(".mp4") > -1 ) {

    // otherwise we're just going to load the video
    if (playerSts.specs.fn.indexOf("?stereo=") > -1) {

      playerSts.specs.video_fn = playerSts.specs.fn.split("?stereo=")[0];
      playerSts.specs.stereo = ( playerSts.specs.fn.split("?stereo=")[1] == 'true' );

    } else {

      playerSts.specs.video_fn = playerSts.specs.fn;
      playerSts.specs.stereo = false;
    }

    createPlayer(playerSts.specs.video_fn, playerSts.specs.stereo);
  }

}

function getPossibleOrientations(){
  if (playerSts.specs.playback !== null) {

    // get relevant orientation objects
    var res = $(playerSts.specs.playback.orientation).filter(function(){
      return this.start <= playerSts.currentTime 
          && this.end > playerSts.currentTime;
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
    if (res !== null && res[0] !== playerSts.current_orientation) {
      var first_orientation = res[0];
      vrView.setOrientation(first_orientation);
      playerSts.current_orientation = first_orientation;
    }
}

// update the options for the video player
// orientation, but only change the orientation when the user asks to
function updateOrientationOptions(){
  var res = getPossibleOrientations();

  // we're only going to update if the possible orientations have changed
  if (res !== null) {
    if (!playerSts.specs.possible_orientations 
      || playerSts.specs.possible_orientations.toString() !== res.toString()) {
      playerSts.specs.possible_orientations = res;
      playerSts.specs.next_orientation_i = 0;
    }
  }
}

function updateSubtitle() {
  // get relevant subtitles
  var res = $(playerSts.specs.playback.subtitles).filter(function(){
      return this.start <= playerSts.currentTime 
          && this.end > playerSts.currentTime;
  });

  if (res.length > 0 
      && res[0] 
      && res[0].text 
      && res[0].text !== playerSts.current_subtitle) {

    // remove existing subtitle if there is one
    if ( playerSts.current_subtitle ) {
      vrView.subtitle( playerSts.current_subtitle ) ;
      playerSts.current_subtitle = undefined ;
    }

    var subtitleText = res[0].text ;
    vrView.subtitle( subtitleText ); 
    playerSts.current_subtitle = subtitleText ;
  }
}

function listenForCurrentTime() {
  // we need to listen for events
  iframe = getIframedocument();
  iframe.addEventListener("currenttimeanswer" , function(e){
    // update that current time!
    playerSts.currentTime = e.detail;
    
    // also, update the orientation accordingly
    if (playerSts.specs.mode === "optional_cuts") {
      updateOrientationOptions();
    } else if (playerSts.specs.mode === "forced_cuts") {
      updateOrientation();
    }

    if (playerSts.specs.subtitles && playerSts.specs.playback) {
      updateSubtitle();
    }

    if (playerSts.timeline) {
      updateTimeline();
      $('#currentTime').text(playerSts.currentTime);
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

function isTouchCardboardButton(e) {
  var clientHeight = e.target.clientHeight;
  var clientWidth = e.target.clientWidth;

  var firstTouch = e.originalEvent.touches[0];
  var x = firstTouch.clientX;
  var y = firstTouch.clientY;

  // if the x is between 40%-60% of width and y is in top 20%
  // TODO: also check cardboard mode
  if ( x/clientWidth > .4 && x/clientWidth < .6
    && y/clientHeight < .2 ) {
    console.log("Detected cardboard touch");
    return true;
  } else {
    return false;
  }
}

function onCardboardButtonPress() {
  // for now we're just going to change the orientation
  onToggleOrientation();
}

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
  setupTimeline(playerSts.specs.video_fn);

  $(getIframedocument()).on('touchstart', function(e){
      if (isTouchCardboardButton(e)) {
        onCardboardButtonPress();
      }
  });
}

function onToggleOrientation() {
  var orientations = playerSts.specs.possible_orientations;
  var i = playerSts.specs.next_orientation_i;
  console.log(orientations);
  console.log(i);
  if (orientations.length > 0 && i !== undefined) {
    // set orientation to the next orientation
    vrView.setOrientation(orientations[i]); 

    // figure out the next orientation_i;
    if ( i + 1 < orientations.length ) {
      playerSts.specs.next_orientation_i = i + 1;
    } else {
      playerSts.specs.next_orientation_i = 0;
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
  if (playerSts.specs.mode === "forced_cuts") {
    playerSts.specs.mode = "optional_cuts";
    $(forcedcutsButton).text("Switch to forced cuts");
    $(orientationButton).removeClass("disabled");
  } else if (playerSts.specs.mode === "optional_cuts"){
    playerSts.specs.mode = "forced_cuts";
    $(forcedcutsButton).text("Switch to optional cuts");
    $(orientationButton).addClass("disabled");
  }
}

function onToggleSubtitles() {
  if (playerSts.specs.subtitles) {
    $(subtitlesButton).text("Turn on subtitles");
    playerSts.specs.subtitles = false;
    vrView.subtitle(playerSts.current_subtitle);
  } else {
    $(subtitlesButton).text("Turn off subtitles");
    playerSts.specs.subtitles = true;
  }
}

window.addEventListener('load', onLoad);
