// Based on the example in ../video/ and edited heavily

var vrView;

var playButton;
var muteButton;
var orientationButton;
var forcedcutsButton;
var subtitlesButton;
var historyshotchangeButton;
var pauseshotchangeButton;

var timelineSlider;
var durationVideoPlayer;

var PI_DENOMINATOR = 4;
var FOV_RADIANS = 0.20;
var circle_high = Math.PI + Math.PI/2;
var circle_low = - Math.PI/2;

// first time play?
var firstTimePlay = true;
VIDEO_START_TIME = null;

// player settings
sts = {
  setOrientationOffset: 1.570796326794897,
  currentTime: 0,
  cuts: {
    required_time: 3,
    current_shot: {"name": null, "start": null, "end": null},
    pause_shot_change: false,
    history_shot_change: false,
  },
  theta: {
    current: null,
    last: null,
    time_set: null,
    shot_history: [],
    rec_change: 0.01
  },
  specs: { // specifications for playback
    fn: null,
    mode: "optional_cuts",
    subtitles: true,
    playback: null,
  },
  timeline: null,
  boundaries: null,
  $spec_composer: $('#spec-composer'),
  dirty: {
    currentTheta: false,
    currentTime: false,
    possible_orientations: false,
  },
};

// http://stackoverflow.com/a/8273091 by Tadeck
function range(start, stop, step) {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
};

function pausedLookingAround(){
  var d = new Date(); var t = d.getTime();
  var time_diff = t - sts.theta.time_set;
  if ((time_diff)/1000.0 > sts.cuts.required_time) {
     return true; 
  }
  return false;
};

function lookedInAllDirections(){
  var req = range(circle_low, circle_high, FOV_RADIANS*2);

  // http://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
  var zeros = Array.apply(null, Array(req.length)).map(Number.prototype.valueOf,0);

  for (var i = 0; i < sts.theta.shot_history.length; i++) {
    var hist = sts.theta.shot_history[i];
    var low = req.filter(function(d){return d < hist});
    if (low.length > 0) {
      var index = req.indexOf(low[low.length - 1]);
      zeros[index] = 1;
    }
  };

  // if we've visited (almost)? every section
  console.log(zeros.filter(function(x){return x==1}).length +"/" +zeros.length);
  if (zeros.filter(function(x){return x==1}).length >= zeros.length - 3) {
    return true;
  }
  return false;
};


function isMobile() {
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    return true;
  } 
  return false;
}

function onSliderChange() {
  var value = sts.timeline.slider("value");
  vrView.seek(value/1000.0);
}

function updateTimeline() {
  sts.timeline.slider("value", sts.currentTime * 1000.0);
}

function additionalOrientation(orientation) {
  var sc = sts.$spec_composer;
  if (sc.is(":visible")) {
    var new_text = sc.val() + " " + orientation;
    sc.val(new_text);
  }
}

function addOrientationChange(time, orientation) {
  var sc = sts.$spec_composer;
  if (sc.is(":visible")) {
     var new_text = sc.val() + "\n" + time + " " + orientation;
     sc.val(new_text);
  } else {
    sc.show();
    sc.val(time + " " + orientation);
  }
}

function outputNewSpec() {

  var sc_text = sts.$spec_composer.val();
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
      fn: sts.specs.video_fn,
      stereo: sts.specs.stereo
  });

  out = addToOut(titles_times[titles_times.length - 1], [sts.specs.duration], out);
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
        addOrientationChange(sts.currentTime, sts.theta.current);

    // if you've pressed an m, append an orientation to the last line
    } else if (k === 109){
        additionalOrientation(sts.theta.current);

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
    sts.specs.duration = seconds; 
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

    sts.timeline = $(timelineSlider);
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
  orientationVideoChangeButton = document.querySelector('#toggleorientationvideochange');
  forcedcutsButton = document.querySelector('#toggleforcedcuts');
  subtitlesButton = document.querySelector('#togglesubtitles');

  pauseshotchangeButton = document.querySelector('#togglepauseshotchange');
  historyshotchangeButton = document.querySelector('#togglehistoryshotchange');

  timelineSlider = document.querySelector('#slider');
  durationVideoPlayer = document.querySelector('#fake-video-player');

  playButton.addEventListener('click', onTogglePlay);
  muteButton.addEventListener('click', onToggleMute);
  orientationButton.addEventListener('click', onToggleOrientation);
  orientationPauseButton.addEventListener('click', onToggleOrientationPause);
  orientationVideoChangeButton.addEventListener('click', onToggleOrientationVideoChange);

  pauseshotchangeButton.addEventListener('click', onTogglePauseShotChange);
  historyshotchangeButton.addEventListener('click', onToggleHistoryShotChange);

  forcedcutsButton.addEventListener('click', onToggleForcedCuts);
  subtitlesButton.addEventListener('click', onToggleSubtitles);

}

function createPlayer(video_fn, stereo) {
  sts.specs.current_video_fn = video_fn; // TODO move this somewhere better (for orientation change)

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

  if (q[q.length-1].indexOf("backgroundVideo") < 0) {
    sts.specs.fn = q[q.length-1];
  } else {
    var q2 = q[q.length-1].split("?backgroundVideo=");
    sts.specs.fn = q2[0];
    sts.specs.background_video_fn = q2[1];
  }
  console.log("Main file: " + sts.specs.fn);
  console.log("Background video: " + sts.specs.background_video_fn);

  // load playback instructions if there is a spec json
  if ( sts.specs.fn && sts.specs.fn.toLowerCase().indexOf(".json") > -1) {
    $.getJSON(sts.specs.fn, function( data ) {
      sts.specs.playback = data;

      // todo: create player that cuts between multiple videos
      if (sts.specs.playback.videos.length >= 1) {
        var video_fn = sts.specs.playback.videos[0].fn;
        var stereo = sts.specs.playback.videos[0].stereo;

        sts.specs.video_fn = video_fn;
        sts.specs.stereo = stereo;

        addButtons();
        createPlayer(video_fn, stereo);

        // we can get rid of currentTime because that ugly
        $('#currentTime').hide();
      }
    });
  } else if (sts.specs.fn 
          && sts.specs.fn.toLowerCase().indexOf(".mp4") > -1 ) {

    // otherwise we're just going to load the video
    if (sts.specs.fn.indexOf("?stereo=") > -1) {

      sts.specs.video_fn = sts.specs.fn.split("?stereo=")[0];
      sts.specs.stereo = ( sts.specs.fn.split("?stereo=")[1] == 'true' );

    } else {

      sts.specs.video_fn = sts.specs.fn;
      sts.specs.stereo = false;
    }

    addButtons();
    createPlayer(sts.specs.video_fn, sts.specs.stereo);

    // we don't need some of the buttons
    $(orientationButton).hide();
    $(forcedcutsButton).hide();
    $(subtitlesButton).hide();
    $(orientationPauseButton).hide();
    $(orientationVideoChangeButton).hide();

  }

}

function getPossibleOrientations(){
  if (sts.specs.playback !== null) {

    // get relevant orientation objects
    var res = $(sts.specs.playback.orientation).filter(function(){
      return this.start <= sts.currentTime 
          && this.end > sts.currentTime;
    });

    // for each relevant orientation object, append possible orientations
    var all_orientations = [];
    for (var i = 0; i < res.length; i++) {
      all_orientations = all_orientations.concat(res[i].orientations);
    };
    return all_orientations;
  }
}

// force update the video player orientation
// to the first possible orientation
function updateOrientation(){
    var res = getPossibleOrientations();

    // if there are any possible orientations, we're just going 
    // to take the first one and trigger a cut
    if (res !== null && res[0] !== sts.current_orientation) {
      var first_orientation = res[0];
      vrView.setOrientation(first_orientation);
      sts.current_orientation = first_orientation;
    } 
}

// update the options for the video player
// orientation, but only change the orientation when the user asks to
function updateOrientationOptions(){
  var res = getPossibleOrientations();

  var is_changed = (sts.specs.possible_orientations + "") !== (res + "");

  // we're only going to update if the possible orientations have changed
  if (is_changed) {
    sts.specs.possible_orientations = res;
    sts.specs.next_orientation_i = 0;
    sts.specs.possible_orientations_dirty = true;

    if (sts.specs.mode === "forced_cuts") {
      updateOrientation();
    }
  }
}

// force update current shot and if the shot is
// different then clear out the shot history
function updateShot() {
  var rel_shot = sts.specs.playback.shots.filter(function(d){
    return sts.currentTime >= d.start && sts.currentTime < d.end;
  });
  if (rel_shot.length > 0 && sts.cuts.current_shot.name !== rel_shot[0].name) {
    sts.cuts.current_shot = rel_shot[0];
    sts.theta.shot_history = [];
  }
}

function updateSubtitle() {
  // get relevant subtitles
  var res = $(sts.specs.playback.subtitles).filter(function(){
      return this.start <= sts.currentTime 
          && this.end > sts.currentTime;
  });

  if (res.length > 0 
      && res[0] 
      && res[0].text 
      && res[0].text !== sts.current_subtitle) {

    // remove existing subtitle if there is one
    if ( sts.current_subtitle ) {
      vrView.subtitle( sts.current_subtitle ) ;
      sts.current_subtitle = undefined ;
    }

    var subtitleText = res[0].text ;
    vrView.subtitle( subtitleText ); 
    sts.current_subtitle = subtitleText ;
  }
}

function switchVideo( video_fn, video_type ) {
  sts.cantChangeVideo = true;

  params = {};
  if (video_fn.indexOf("invasion") > -1) {
      params.is_stereo = true;
  } else {
      params.is_stereo = false;
  }

  if (video_type === "background") {
    console.log("Switched to background");
    sts.specs.current_video_fn = video_fn;
    params.video = video_fn + "#t=" + 0;
    params.default_yaw_radians = sts.theta.current ;

    console.log(params);
    vrView.setContent(params);
    playButton.classList.remove('paused');

  } else if (video_type === "main") {

    console.log("Switched to main");
    sts.specs.current_video_fn = video_fn;
    params.video = video_fn + "#t=" + sts.currentTime;
    params.default_yaw_radians = sts.theta.current;
    console.log(params);

    vrView.setContent(params);
    playButton.classList.remove('paused');
    
  }
  setTimeout(function(){
    sts.cantChangeVideo = false;
  }, 1000)
}

function isThetaInBoundary(cur_theta, imp_theta, poffset){
  var left_bound = imp_theta - poffset;
  var right_bound = imp_theta + poffset;

  var within_imp_to_left_bound = cur_theta > left_bound && cur_theta <= imp_theta;
  var within_imp_to_right_bound = cur_theta < right_bound && cur_theta >= imp_theta;

  if (left_bound < circle_low) {
    var adj_left_bound = circle_high - (circle_low - left_bound);
    within_imp_to_left_bound = cur_theta > adj_left_bound || cur_theta <= imp_theta;
  } 

  if (right_bound > circle_high) {
    var adj_right_bound = circle_low + (right_bound - circle_high);
    within_imp_to_right_bound = cur_theta >= imp_theta || cur_theta < adj_right_bound;
  }

  if (within_imp_to_right_bound || within_imp_to_left_bound) {
    return true;
  } 
  return false;
}

function changeVideoBasedOnOrientation(){

  // get the possible orientations
  var orientations = sts.specs.possible_orientations;
  var current_orientation = sts.theta.current;
  var possible_offset = Math.PI/PI_DENOMINATOR; // TODO make customizable
  var within_one_boundary = false;

  // we're only going to restrict this if there are orientations
  if (orientations.length > 0) {
    for (var i = 0; i < orientations.length; i++) {
        var orient = orientations[i];
        // only set if not already true
        within_one_boundary = isThetaInBoundary(current_orientation, orient, possible_offset) || within_one_boundary;
    };
  } else {
    within_one_boundary = true;
  }

  // if we're in the boundary and not playing the main video
  // switch to the main video
  if (within_one_boundary 
    && sts.specs.current_video_fn !== sts.specs.video_fn
    && !sts.cantChangeVideo) {

    switchVideo(sts.specs.video_fn, "main");

  // if we're outside of the boundary and not playing the background video
  // switch to the background video
  } else if (!within_one_boundary
    && sts.specs.background_video_fn // we need to actually have one specified though
    && sts.specs.current_video_fn !== sts.specs.background_video_fn
    && !sts.cantChangeVideo) {

    switchVideo(sts.specs.background_video_fn, "background");

  }

  sts.current_theta_dirty = false;
  sts.specs.possible_orientations_dirty = false;
}

function changeShotBasedOnHistoryOrPause() {
  // for now we're just going to jump to the main shot
  // if we're in establishing shot and meets criteria
  var history_criteria = (lookedInAllDirections() && sts.cuts.history_shot_change);
  var pause_criteria = (pausedLookingAround() && sts.cuts.pause_shot_change);

  if (sts.cuts.current_shot.name === "establishing-shot"
    && (history_criteria || pause_criteria)) {
    var main_shot = sts.specs.playback.shots.filter(function(s){
      return s.name === "main";
    });
    if (main_shot.length > 0) {
      vrView.seek(main_shot[0].start);
    }
  }
} 

function filterBasedOnOrientationInteractions(){
  var orientation_information_is_changed = sts.specs.possible_orientations_dirty || sts.current_theta_dirty;

  if (sts.specs.mode === "optional_cuts") {
    // orientation change options
    if (sts.specs.orientationpause && orientation_information_is_changed) {
      playOrPauseBasedOnOrientation();
    } else if (sts.specs.orientationvideochange && orientation_information_is_changed) {
      changeVideoBasedOnOrientation();
    }

    // shot change options
    if (sts.specs.playback.shots 
      && sts.cuts.pause_shot_change || sts.cuts.history_shot_change) {
      changeShotBasedOnHistoryOrPause();
    }
  } 
}

function listenForCurrentTime() {
  // we need to listen for events
  iframe = getIframedocument();

  iframe.addEventListener("currenttimeanswer" , function(e){
    // update that current time!
    var last_current_time = sts.currentTime;

    // if time has updated and its not the background video
    if (last_current_time !== e.detail
      && (!sts.specs.background_video_fn 
       || sts.specs.background_video_fn !== sts.specs.current_video_fn)) {

      // console.log(sts.currentTime + ", "  + sts.theta.current + ", " + sts.specs.current_video_fn);
      sts.currentTime = e.detail;

      if (sts.specs.subtitles && sts.specs.playback) {
        updateSubtitle();
      }
      if (sts.timeline) {
        updateTimeline();
        $('#currentTime').text(sts.currentTime);
      } 
      if (sts.specs.playback && sts.specs.playback.shots) {
        updateShot();
      }
      updateOrientationOptions();
      filterBasedOnOrientationInteractions();
    }
  });

  // this could be useful
  iframe.addEventListener("getorientationanswer" , function(e) {
    
    var new_theta = e.detail +  sts.setOrientationOffset;

    if (new_theta !== sts.theta.current) {

      // we only want to update last theta/time changed if the 
      // theta looks like its more than noise
      if (Math.abs(new_theta - sts.theta.current) > sts.theta.rec_change) {
        sts.theta.last = sts.theta.current;
        var d = new Date();
        sts.theta.time_set = d.getTime();
        sts.theta.shot_history.push(sts.theta.current);
      }
      // we'll update the new theta no matter what
      sts.theta.current = new_theta;
      
      sts.current_theta_dirty = true;
      filterBasedOnOrientationInteractions();
    }
  });

  // but also we need to ask for it all of the time :(
  setInterval(function() {
    vrView.currentTime();
    vrView.getOrientation(); 
  }, 1000/29);
}

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

  setupTimeline(sts.specs.video_fn);

  $(getIframedocument()).on('touchstart', function(e){
      if (isTouchCardboardButton(e)) {
        onCardboardButtonPress();
      }
  });
}

function playOrPauseBasedOnOrientation() {

  // get the possible orientations
  var orientations = sts.specs.possible_orientations;
  var current_orientation = sts.theta.current;
  var possible_offset = Math.PI/PI_DENOMINATOR; // TODO make customizable

  var within_one_boundary = false;

  // we're only going to restrict this if there are orientations
  if (orientations) {
    for (var i = 0; i < orientations.length; i++) {
        var orient = orientations[i];
        within_one_boundary = isThetaInBoundary(current_orientation, orient, possible_offset) || within_one_boundary; 
    };
  } else {
    within_one_boundary = true;
  }

  if (within_one_boundary
    && sts.pausedFromOrientation 
      && vrView.isPaused) {

    // if the video is not playing, play the video
    onTogglePlay();
    sts.pausedFromOrientation = false;

  } else if (!within_one_boundary && !vrView.isPaused) {
    onTogglePlay();
    // if the video is not paused, pause the video
    sts.pausedFromOrientation = true; // TODO: hacky fix
  }

  sts.current_theta_dirty = false;
  sts.specs.possible_orientations_dirty = false;
}

function onToggleOrientation() {
  var orientations = sts.specs.possible_orientations;
  var i = sts.specs.next_orientation_i;

  if (orientations.length > 0 && i !== undefined) {
    // set orientation to the next orientation
    vrView.setOrientation(orientations[i]); 

    // figure out the next orientation_i;
    if ( i + 1 < orientations.length ) {
      sts.specs.next_orientation_i = i + 1;
    } else {
      sts.specs.next_orientation_i = 0;
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
  if (sts.specs.mode === "forced_cuts") {
    sts.specs.mode = "optional_cuts";
    $(forcedcutsButton).text("Switch to forced cuts");
    $(orientationButton).removeClass("disabled");
  } else if (sts.specs.mode === "optional_cuts"){
    sts.specs.mode = "forced_cuts";
    $(forcedcutsButton).text("Switch to optional cuts");
    $(orientationButton).addClass("disabled");
  }
}

function onTogglePauseShotChange() {
  if (!sts.cuts.pause_shot_change) { 
    sts.cuts.pause_shot_change = true;
    $(pauseshotchangeButton).text("Turn off pause shot change");
  } else {
    sts.cuts.pause_shot_change = false;
    $(pauseshotchangeButton).text("Turn on pause shot change");
  }
}

function onToggleHistoryShotChange() {
  if (!sts.cuts.history_shot_change) { 
    sts.cuts.history_shot_change = true;
    $(historyshotchangeButton).text("Turn off history shot change");
  } else {
    sts.cuts.history_shot_change = false;
    $(historyshotchangeButton).text("Turn on history shot change");
  }
}

function onToggleOrientationPause() {

  if (sts.specs.orientationpause === true) {
    sts.specs.orientationpause = false;
    console.log("orientation pause is false");
    $(orientationPauseButton).text("Turn on orientation pause");

  } else {
    sts.specs.orientationpause = true;
    console.log("orientation pause is true");
    $(orientationPauseButton).text("Turn off orientation pause");
  }
}

function onToggleOrientationVideoChange() {

  if (sts.specs.orientationvideochange === true) {
    sts.specs.orientationvideochange = false;
    console.log("orientation video change is false");
    $(orientationVideoChangeButton).text("Turn on orientation video change");

  } else {
    sts.specs.orientationvideochange = true;
    console.log("orientation video change is true");
    $(orientationVideoChangeButton).text("Turn off orientation video change");
  }
}

function onToggleSubtitles() {
  if (sts.specs.subtitles) {
    $(subtitlesButton).text("Turn on subtitles");
    sts.specs.subtitles = false;
    vrView.subtitle(sts.current_subtitle);
  } else {
    $(subtitlesButton).text("Turn off subtitles");
    sts.specs.subtitles = true;
  }
}

window.addEventListener('load', onLoad);
