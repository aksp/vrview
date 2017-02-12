// Based on the example in ../video/ and edited heavily

var vrView;

var playButton;
var muteButton;
var orientationButton;
var forcedcutsButton;
var subtitlesButton;

var timelineSlider;
var durationVideoPlayer;

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

function isMobile() {
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    return true;
  } 
  return false;
}

function onSliderChange() {
  var value = playerSts.timeline.slider("value");
  vrView.seek(value/1000.0);
}

function updateTimeline() {
  playerSts.timeline.slider("value", playerSts.currentTime * 1000.0);
}

function additionalOrientation(orientation) {
  var sc = playerSts.$spec_composer;
  if (sc.is(":visible")) {
    var new_text = sc.val() + " " + orientation;
    sc.val(new_text);
  }
}

function addOrientationChange(time, orientation) {
  var sc = playerSts.$spec_composer;
  if (sc.is(":visible")) {
     var new_text = sc.val() + "\n" + time + " " + orientation;
     sc.val(new_text);
  } else {
    sc.show();
    sc.val(time + " " + orientation);
  }
}

function outputNewSpec() {

  var sc_text = playerSts.$spec_composer.val();
  var sc_text_arr = sc_text.split("\n");
  var out = {"subtitles": [], "orientation": [], "videos": []};
  var titles_times = [];

  for (var i = 0; i < sc_text_arr.length; i++) {

    var els = sc_text_arr[i].split(" ");

    var start = undefined; 
    var o1 = undefined;
    var o2 = undefined;
    var text = undefined;

    if (els.length > 0) {
      start = parseFloat(els[0]);
    }
    if (els.length > 1) {
      o1 = parseFloat(els[1]);
    } 

    if (els.length > 2) {
      if (isNaN(els[2])) { // if its not a number, we should assume its all text
        text = els.splice(2,els.length).join(" ");
      } else {
        o2 = parseFloat(els[2]);
        text = els.splice(3,els.length).join(" ");
      }
    }

    var res = {
      "start": start,
      "o1": o1,
      "o2": o2,
      "text": text
    };
    console.log(res);
    titles_times.push(res);

  };

  function addToOut(tt1, tt2, out) {

    var start = tt1.start;
    var end = tt2.start;
    var text;

    if (tt1.text !== undefined && tt1.text !== "") {
      out.subtitles.push({
        start: start,
        end: end,
        text: tt1.text
      });
    }

    var out_orientation = {
      start: start,
      end: end,
      orientations: [],
    }
    if (tt1.o1 !== undefined) {
      out_orientation.orientations.push(tt1.o1);
    } 
    if (tt1.o2 !== undefined) {
      out_orientation.orientations.push(tt1.o2);
    }

    out.orientation.push(out_orientation);
    return out;

  }

  for (var i = 0; i < titles_times.length - 1; i++) {

    out = addToOut(titles_times[i], titles_times[i+1], out);

  };

  out.videos.push({
      fn: playerSts.specs.video_fn,
      stereo: playerSts.specs.stereo
  });

  out = addToOut(titles_times[titles_times.length - 1], [playerSts.specs.duration], out);
  console.log(JSON.stringify(out));

}

function setTimelineKeycodes() {
  $(document).on("keypress", function(e){
    var k = e.keyCode;

    // if you've pressed space
    if (k === 32 && e.target == document.body) {

      e.preventDefault();
      onTogglePlay();

    // if you've pressed o, add the time and current orientation to a new line
    } else if ( k === 111 && $(e.target).attr("id") !== "spec-composer") {
        addOrientationChange(playerSts.currentTime, playerSts.currentTheta);

    // if you've pressed an m, append an orientation to the last line
    } else if (k === 109){
        additionalOrientation(playerSts.currentTheta);

    // you've pressed s
    } else if (k === 115 && $(e.target).attr("id") !== "spec-composer") {
       outputNewSpec();
    }

  });
}

function setupTimeline(video_fn) {

  // next 5 lines to find duration
  $(durationVideoPlayer).hide();
  $(durationVideoPlayer).html('<video src=' + video_fn + ' preload="metadata"></video>');
  $(durationVideoPlayer).find("video").eq(0).on("durationchange", function(){
    var seconds = $(this)[0].duration;
    playerSts.specs.duration = seconds; 
    console.log("Video duration: " + seconds);

    // now setup the timeline with this duration
    var ms = seconds * 1000;
    $(timelineSlider).slider({
      max: ms,
      slide: onSliderChange
    });

    // if the cell phone is mobile, we're going to have to change the 
    if (isMobile()) {
      $(timelineSlider).css({"width": "80%", "margin-left": "10%"});
    }

    playerSts.timeline = $(timelineSlider);
    $(durationVideoPlayer).remove();

    setTimelineKeycodes();
  });
}

function getIframedocument(){
    return $('iframe').eq(0)[0].contentWindow.document;
}

function addButtons() {
  // define buttons and add event listeners
  playButton = document.querySelector('#toggleplay');
  muteButton = document.querySelector('#togglemute');
  orientationButton = document.querySelector('#toggleorientation');
  orientationPauseButton = document.querySelector('#toggleorientationpause');
  forcedcutsButton = document.querySelector('#toggleforcedcuts');
  subtitlesButton = document.querySelector('#togglesubtitles');
  timelineSlider = document.querySelector('#slider');
  durationVideoPlayer = document.querySelector('#fake-video-player');

  playButton.addEventListener('click', onTogglePlay);
  muteButton.addEventListener('click', onToggleMute);
  orientationButton.addEventListener('click', onToggleOrientation);
  orientationPauseButton.addEventListener('click', onToggleOrientationPause);
  forcedcutsButton.addEventListener('click', onToggleForcedCuts);
  subtitlesButton.addEventListener('click', onToggleSubtitles);

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

        addButtons();
        createPlayer(video_fn, stereo);

        // we can get rid of currentTime because that ugly
        $('#currentTime').hide();
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

    addButtons();
    createPlayer(playerSts.specs.video_fn, playerSts.specs.stereo);

    // we don't need some of the buttons
    $(orientationButton).hide();
    $(forcedcutsButton).hide();
    $(subtitlesButton).hide();
    $(orientationPauseButton).hide();

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

      if (playerSts.specs.orientationpause) {
        playOrPauseBasedOnOrientation();
      }
      

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

  // this could be useful
  iframe.addEventListener("getorientationanswer" , function(e) {
    playerSts.currentTheta = e.detail +  1.570796326794897; // TODO fix this hacky fix to offset problem
  });

  // but also we need to ask for it all of the time :(
  setInterval(function() {
    vrView.currentTime();
    vrView.getOrientation(); 
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

function playOrPauseBasedOnOrientation() {

  // get the possible orientations
  var orientations = playerSts.specs.possible_orientations;
  var current_orientation = playerSts.currentTheta;
  var possible_offset = Math.PI/2; // TODO make customizable

  if (!orientations) {
    orientations = [0];
  }

  var within_one_boundary = false;

  for (var i = 0; i < orientations.length; i++) {
      var orient = orientations[i];

      var lower_bound = orient - possible_offset;
      var upper_bound = orient + possible_offset;

      // if within boundaries play that thing
      if (lower_bound < current_orientation
          && current_orientation < upper_bound) {

        within_one_boundary = true;
      } 
  };

  if (within_one_boundary
      && playerSts.pausedFromOrientation 
        && vrView.isPaused) {

    // if the video is not playing, play the video
    onTogglePlay();
    playerSts.pausedFromOrientation = false;

  } else if (!within_one_boundary && !vrView.isPaused) {
    onTogglePlay();
    // if the video is not paused, pause the video
    playerSts.pausedFromOrientation = true; // TODO: hacky fix
  }

}

function onToggleOrientation() {
  var orientations = playerSts.specs.possible_orientations;
  var i = playerSts.specs.next_orientation_i;

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

function onToggleOrientationPause() {

  if (playerSts.specs.orientationpause === true) {
    playerSts.specs.orientationpause = false;
    console.log("orientation pause is false");
    $(orientationPauseButton).text("Turn on orientation pause");

  } else {
    playerSts.specs.orientationpause = true;
    console.log("orientation pause is true");
    $(orientationPauseButton).text("Turn off orientation pause");
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
