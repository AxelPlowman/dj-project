//////////////////////////////////////////
//	VARIABLES
//////////////////////////////////////////

    //Saves the canvas and audio elements from the HTML in a variables (and adds a 2d context to the canvas and saves this in a variable).
var canvas = document.getElementById("visuals"),
	canvasCtx = canvas.getContext("2d"),
    player1 = document.getElementById("player1"),
    player2 = document.getElementById("player2"),
    
    PBSpeedDeck1,
    PBSpeedDeck2,
    
    //The variables beneath are all the nodes in the 'chain' (or path) between the audiosource and the actual output (sound!). To give an example: the analyser variable creates an analyser node in the audiocontext. When the audio source is connected with this analyser, then the analyser can analyse the audio. 
	audioCtx = new AudioContext(),
	source1 = audioCtx.createMediaElementSource(player1),
	source2 = audioCtx.createMediaElementSource(player2),
	frameLooperRunning = false,
    
	splitterNodes = [
		audioCtx.createChannelSplitter(2),
		audioCtx.createChannelSplitter(2)
	],
	gainNodes = [
		audioCtx.createGain(),
		audioCtx.createGain(),
		audioCtx.createGain(),
		audioCtx.createGain()
	],

	merger = audioCtx.createChannelMerger(4),

	analyser = audioCtx.createAnalyser(),

	//Creates ten biquadFilter nodes, one for each frequency in our equaliser.
	EQNodes = [
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter(), 
		audioCtx.createBiquadFilter()
	],

	//Frequencies that can be boosted or decreased in volume.
	equaliserFrequencies = [
		32,
		54,
		125,
		250,
		500,
		1000,
		2000,
		4000,
		8000,
		16000
	],

	//Excuse me, ten slider inputs coming trough...
	sliderIDList = [
	'#EQValueIn1',
	'#EQValueIn2',
	'#EQValueIn3',
	'#EQValueIn4',
	'#EQValueIn5',
	'#EQValueIn6',
	'#EQValueIn7',
	'#EQValueIn8',
	'#EQValueIn9',
	'#EQValueIn10',
	];

	//Variables for the visuals and the soundcloud sections (most to be filled later on):
var fbcArray, 
    bars, 
    barX, 
    barWidth, 
    barHeight,
    audioSource,
    searchQuery,
	maxResultsAmount= 15,
	searchResults = {
		header: 'Search Results',
		songs: []
	};

//////////////////////////////////////////
//	WEB SOUND API ELEMENT SETTINGS
//////////////////////////////////////////

//Sets analyser's FFTSize-property.
analyser.FFTSize = 2048; 

//BiquadFilter default settings.
for (var i = 0; i < EQNodes.length; i++) {
	EQNodes[i].type = "peaking";
	EQNodes[i].Q.value = 1;
	EQNodes[i].frequency.value = equaliserFrequencies[i];
	EQNodes[i].gain.value = 0;
}


//////////////////////////////////////////
//	EVENT LISTENERS
//////////////////////////////////////////

//load song to deck 1.
$('#listSongs').on('click', '.deck1Button', function() {
	var songNumber = this.id;
	var songURL = searchResults.songs[songNumber].url;
	new SoundCloudAudioSource1(player1).loadStream(songURL);
	console.log("DECK-1 buttonNumber = #" + songNumber);
});

//load song to deck 2.
$('#listSongs').on('click', '.deck2Button', function() {
	var songNumber = this.id;
	var songURL = searchResults.songs[songNumber].url;
	new SoundCloudAudioSource2(player2).loadStream(songURL);
	console.log("DECK-2 buttonNumber = #" + songNumber);
});

//Range slider inputs to equaliser nodes.
document.querySelector(".equaliserSliders").addEventListener('input', function () {
	for (var i = 0; i < EQNodes.length; i++) {
		EQNodes[i].gain.value = document.querySelector(sliderIDList[i]).value;
		console.log(EQNodes[i].gain.value);
	}
}, false);

//Reset button.
document.querySelector(".resetButton").addEventListener('click', function () {
	for (var i = 0; i < EQNodes.length; i++) {
		EQNodes[i].gain.value = 0;
		console.log(EQNodes[i].gain.value);
	}
}, false);

//More results (or Less results) button.
document.querySelector(".moreResults").addEventListener('click', function () {
    if (maxResultsAmount === 15) {
        maxResultsAmount = 30;
        soundcloudRequest();
        document.querySelector(".moreResults").textContent = "Less results";
    }
    else {
        maxResultsAmount = 15;
        soundcloudRequest(); 
        document.querySelector(".moreResults").textContent = "More results";
    }
}, false);

//Range slider inputs to playbackSpeed.
//Deck 1
document.querySelector("#tempoDeck1").addEventListener('input', function () {
	PBSpeedDeck1 = document.querySelector('#tempoDeck1').value;
	player1.playbackRate = document.querySelector('#tempoDeck1').value;
	var label = document.getElementById('tempoDeck1Label');
	var labelValue = (((player1.playbackRate-1)*100).toFixed(1) + "%");
	label.innerHTML = labelValue;
	console.log("player1.playbackRate = " + player1.playbackRate);
}, false);
//Deck 2
document.querySelector("#tempoDeck2").addEventListener('input', function () {
	PBSpeedDeck2 = document.querySelector('#tempoDeck2').value;
	player2.playbackRate = document.querySelector('#tempoDeck2').value;
	var label = document.getElementById('tempoDeck2Label');
	var labelValue = (((player2.playbackRate-1)*100).toFixed(1) + "%");
	label.innerHTML = labelValue;
	console.log("player2.playbackRate = " + player2.playbackRate);
}, false);

//CrossFader
document.querySelector(".crossFader").addEventListener('input', function () {
	crossFaderPosition = document.querySelector('.crossFader').value;
	console.log(crossFaderPosition);
	var x = crossFaderPosition;
	console.log(x);
    //Use an equal-power crossfading curve:
	var gain1 = Math.cos(x * 0.5*Math.PI);
	var gain2 = Math.cos((1.0 - x) * 0.5*Math.PI);
	console.log("gain1 value = " + gain1);
	console.log("gain2 value = " + gain2);
	gainNodes[0].gain.value = gain1;
	gainNodes[1].gain.value = gain1;
	gainNodes[2].gain.value = gain2;
	gainNodes[3].gain.value = gain2;
}, false);

//Gives an alert to the user when the song is blocked because of copyright restrictions of the browser.
player1.addEventListener('error', function(e) {
    var noSourceLoaded = (this.networkState===HTMLMediaElement.NETWORK_NO_SOURCE);
    if(noSourceLoaded) window.alert("Sorry, this song is blocked (copyright), please try another one");
}, true);
player2.addEventListener('error', function(e) {
    var noSourceLoaded = (this.networkState===HTMLMediaElement.NETWORK_NO_SOURCE);
    if(noSourceLoaded) window.alert("Sorry, this song is blocked (copyright), please try another one");
}, true);

	
//////////////////////////////////////////
//	AUDIO PATH  
//////////////////////////////////////////

//Everything here connects the nodes to each other. In that way an path will be created from the audio source to the actual output (sound!).
source1.connect(splitterNodes[0]);
source2.connect(splitterNodes[1]);

//Future steps are to adjust volume of left gain nodes relative to right gain node.
//This would facilitate a pan knob.

//Connect LEFT channel of deck 1 to gain[0].
splitterNodes[0].connect(gainNodes[0], 0, 0);
//Connect RIGHT channel of deck 1 to gain[1].
splitterNodes[0].connect(gainNodes[1], 1, 0);
//Connect LEFT channel of deck 2 to gain[2].
splitterNodes[1].connect(gainNodes[2], 0, 0);
//Connect RIGHT channel of deck 2 to gain[3].
splitterNodes[1].connect(gainNodes[3], 1, 0);

gainNodes[0].connect(merger, 0, 0);
gainNodes[1].connect(merger, 0, 1);
gainNodes[2].connect(merger, 0, 0);
gainNodes[3].connect(merger, 0, 1);
merger.connect(EQNodes[0]);
EQNodes[0].connect(EQNodes[1]);
EQNodes[1].connect(EQNodes[2]);
EQNodes[2].connect(EQNodes[3]);
EQNodes[3].connect(EQNodes[4]);
EQNodes[4].connect(EQNodes[5]);
EQNodes[5].connect(EQNodes[6]);
EQNodes[6].connect(EQNodes[7]);
EQNodes[7].connect(EQNodes[8]);
EQNodes[8].connect(EQNodes[9]);
EQNodes[9].connect(analyser);
analyser.connect(audioCtx.destination);


//////////////////////////////////////////
//	SOUNDCLOUD
//////////////////////////////////////////

//The search function.
document.querySelector(".submitQuery").addEventListener('click', function () {
	var userInput = document.querySelector("#searchField").value;
	if (userInput.length === 0) {
		alert('Please fill in something!');
	} 
	else {
	searchQuery = userInput.replace(/ /g, "%20").toLowerCase();
	console.log('"' + searchQuery + '" was submitted');
	soundcloudRequest();
	}
});

//This function requests the search results from the Soundcloud API and lists the results on the page.  
function soundcloudRequest() {
	method = "GET";
	requestURL = 'https://api.soundcloud.com/tracks?client_id=00856b340598a8c7e317e1f148b5a13c&limit=' + maxResultsAmount + '&q=' + searchQuery;
	xhr = new XMLHttpRequest();
	xhr.open(method, requestURL, true);
	xhr.send();
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			var APIResponse = JSON.parse(xhr.responseText);
			searchResults.songs = [];
			for (var i=0; i<APIResponse.length; i++){
				songInfo = new Object();
				songInfo.title = (APIResponse[i].title);
				songInfo.url = (APIResponse[i].permalink_url);
				songInfo.uploader = (APIResponse[i].user.username);
				searchResults.songs.push(songInfo);
			}
			
			console.log(searchResults);
            $("#listSongs li").remove();
			var theTemplateScript = $("#list-template").html(); 
            var theTemplate = Handlebars.compile(theTemplateScript); 
            $("#listSongs").append(theTemplate(searchResults.songs));
            
            document.querySelector(".searchHeader").style.visibility = "visible";
            if (searchResults.songs.length === 0) {
                document.querySelector(".searchHeader").textContent = "Search results: no results";
            }
            else {
                document.querySelector(".moreResults").style.visibility = "visible";
                document.querySelector(".searchHeader").textContent = "Search results: " + searchResults.songs.length + " results";
            }
		}
	};
}

//This function requests Soundcloud to give permission to play the song for deck 1.
var SoundCloudAudioSource1 = function(audioElement) {
    player1.crossOrigin = 'Anonymous';
    var self = this;
    self.streamData = new Uint8Array(128);
  
    this.loadStream = function(urlSong) {
        var clientID = "00856b340598a8c7e317e1f148b5a13c";

        SC.initialize({
            client_id: clientID
        });
        SC.get('/resolve', { url: urlSong }, function(track) {
            SC.get('/tracks/' + track.id, {}, function(sound, error) {
                player1.setAttribute('src', sound.stream_url + '?client_id=' + clientID);
                player1.play();
            });
        });
    };
    if (frameLooperRunning === false) {
        frameLooper();
        frameLooperRunning = true;
    }
};

//The same as above, only now for deck 2.
var SoundCloudAudioSource2 = function(audioElement) {
    player2.crossOrigin = 'Anonymous';
    var self = this;
    self.streamData = new Uint8Array(128);
  
    this.loadStream = function(urlSong) {
        var clientID = "00856b340598a8c7e317e1f148b5a13c";

        SC.initialize({
            client_id: clientID
        });
        SC.get('/resolve', { url: urlSong }, function(track) {
            SC.get('/tracks/' + track.id, {}, function(sound, error) {
                player2.setAttribute('src', sound.stream_url + '?client_id=' + clientID);
                player2.play();
            });
        });
    };
    if (frameLooperRunning === false) {
        frameLooper();
        frameLooperRunning = true;
    }
};
   

//////////////////////////////////////////
//	VISUALS
//////////////////////////////////////////

//This function extracts data from the analyser node and uses it to create the animation. It reloads itself each time the screen is 'repainted' by the computer.
function frameLooper() {
	window.requestAnimationFrame(frameLooper);
	fbcArray = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(fbcArray);
	canvasCtx.clearRect(0, 0, canvas.width, canvas.height); 

	bars = 1024;
	for (var i = 0; i < bars; i++) {
		canvasCtx.fillStyle = "hsla("+i+", "+50+Math.floor(fbcArray[i]/255*50)+"%, 70%,"+(fbcArray[i]/255)+")";
		barX = i * 1; 
		barWidth = 1; 
		barHeight = -(fbcArray[i]);
		if (fbcArray[i] >= 0.5) {barHeight = -(fbcArray[i] * 0.5)}
		canvasCtx.fillRect(barX, canvas.height, barWidth, barHeight);
	}
}

