import { WebMidi } from "https://cdn.jsdelivr.net/npm/webmidi@3.0.18/+esm";

var audio, midiOutput, song, lastTimestamp = 0, wakeLock = null;

WebMidi.enable()
	.then(() => {
		logMessage("MIDI available", "info");

		let kemperIndex = 0;
		for (let i = 0; i < WebMidi.outputs.length; i++) {
			var opt = document.createElement('option');
			opt.value = i;
			opt.innerHTML = WebMidi.outputs[i].name;
			document.getElementById("device").appendChild(opt);
			if (WebMidi.outputs[i].name.includes('Profiler')) {
				opt.selected = true;
				kemperIndex = i;
			}
		}

		setup(kemperIndex);
	})
	.catch(err => {
		logMessage("WebMIDI loading error", "error");
		console.error(err);
	});

async function setup(index) {
	audio = document.getElementById("audio");
	midiOutput = WebMidi.outputs[index];

	if (!midiOutput) {
		logMessage("No MIDI devices found", "error");
		return;
	}

	await fetch("songs")
		.then(response => response.json())
		.then(data => {
			for (let i = 0; i < data.length; i++) {
				var opt = document.createElement('option');
				opt.value = data[i];
				opt.innerHTML = data[i];
				document.getElementById("song").appendChild(opt);		
			}
		})
		.catch(err => {
			logMessage("Songs list loading error", "error");
			console.error(err);
		});

	await fetch("songs/"+document.getElementById("song").value)
		.then(response => response.json())
		.then(data => {
			song = data;
			logMessage("Song loaded", "info");
		})
		.catch(err => {
			logMessage("Song loading error", "error");
			console.error(err);
		});

	audio.src = "audio/"+document.getElementById("song").value+".mp3";

	window.offset = song.offset;
	document.getElementById("offset").value = window.offset;

	audio.addEventListener("timeupdate", checkMidiEvents);
	audio.addEventListener("seeked", resetMidi);
	audio.addEventListener("play", () => logMessage("Audio playback started", "info"));
	audio.addEventListener("pause", () => logMessage("Audio playback paused", "info"));

	requestWakeLock();
}

function checkMidiEvents() {
	let currentTime = audio.currentTime - window.offset/1000;

	song.events.forEach(event => {
		if (event.time > lastTimestamp && event.time <= currentTime) {
			if (midiOutput) {
				midiOutput.sendControlChange(parseInt(event.cc), parseInt(event.value));
				logMessage(event.message, "success");
			}
		}
	});

	lastTimestamp = currentTime;
}

window.changeOffset = changeOffset;
function changeOffset() {
	window.offset = parseInt(document.getElementById("offset").value) || 0;
	logMessage(`Offset set to ${window.offset} ms`, "info");
	lastTimestamp = audio.currentTime - window.offset/1000;

	song.offset = window.offset;
	const selectedSong = document.getElementById("song").value;
	fetch("songs/" + selectedSong, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(song)
	})
	.then(response => {
		if (!response.ok) 
			logMessage("Failed to post song object", "error");
	})
	.catch(err => {
		logMessage("Error posting song object", "error");
		console.error(err);
	});
}

function resetMidi() {
	lastTimestamp = audio.currentTime - window.offset/1000;
}

window.changeSong = changeSong;
function changeSong() {
	const songSelect = document.getElementById("song");
	const selectedSong = songSelect.value;
	fetch("songs/" + selectedSong)
		.then(response => response.json())
		.then(data => {
			song = data;
			logMessage("Song changed to " + selectedSong, "info");
			audio.src = "audio/" + selectedSong + ".mp3";
			window.offset = song.offset;
			document.getElementById("offset").value = window.offset;
		})
		.catch(err => {
			logMessage("Song loading error", "error");
			console.error(err);
		});
}

window.changeDevice = changeDevice;
function changeDevice() {
	const deviceSelect = document.getElementById("device");
	midiOutput = WebMidi.outputs[deviceSelect.value];
	logMessage("MIDI device changed to " + WebMidi.outputs[deviceSelect.value].name, "info");
}

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request("screen");
    } catch (err) {
        console.error(`Wake Lock error: ${err.message}`);
    }
}

function logMessage(message, type) {
	const consoleElement = document.getElementById("console");
	const timestamp = new Date().toLocaleTimeString();
	const p = document.createElement("p");

	p.textContent = `[${timestamp}] ${message}`;
	p.classList.add(type);
	consoleElement.appendChild(p);
	consoleElement.scrollTop = consoleElement.scrollHeight;
}


document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        requestWakeLock();
    }
});