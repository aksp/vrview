API calls
=======

Ones implemented by google (see here: <http://developers.google.com/cardboard/vrview>): 
* vrview.play()
* vrview.pause()

Ones I've implemented: 
* vrview.seek(_seconds_) -- maybe only desktop? Not sure
* vrview.setOrientation(_y-axis-rotation-in-radians_) -- Sets current camera orientation by rotating camera around y axis (works on desktop and cardboard)
* vrview.subtitle(_subtitle-text_) -- If the subtitle isn't currently on the screen, it puts the new text on the screen, if it is on the screen, it removes it (works on desktop and cardboard)

I'm not actually building the project using node. I'm just editing the following files: build/embed.js, build/vrview.js, build/three.js

The video player with the ability to switch cuts is in the examples/orientations/ folder. Your URL should look something like this: "http://localhost/~apavel/360-video-project/vrview/examples/orientations/index.html?f=spec-files/nocuts.json". So, just navigate to examples/orientations/index.html then include the filename with the playback specifications (in this case spec-files/nocuts.json) after this signifier "?f=".  

You'll also want to download the video I've been using here: https://people.eecs.berkeley.edu/~amypavel/vrview/examples/orientations/nocuts.MP4. You may have to change the video path in spec-files/nocuts.json.

Branched from: VR View
=======

VR View allows you to embed 360 degree VR media into websites on desktop and
mobile. For more information, please read the documentation available at
<http://developers.google.com/cardboard/vrview>.
