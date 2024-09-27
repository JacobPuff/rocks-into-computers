# Rocks Into Computers
A presentation on some computer internals and how we combine them to do useful things.

This presentation uses Motion Canvas, a code driven animation software, and takes us from basic logic gates all the way to a full CPU with our own custom instruction set.

### Running
To view the slides, you need to run the local server in the `compiled/` folder:
- if you're on linux run `runServe`
- if you're on windows, my last solution didnt work, you're gonna have to wait.
- if you're on mac, I haven't tested on mac yet.

Then go to `localhost:8080/presentation.html`, and find the "Video Settings". In the video settings click the dropdown next to "RENDER" and click the "PRESENT" option. Then hit the present button and you're good to go.

You can also `npm install` in the root directory, and run `npm run serve`.

### Finished CPU
A video showing 30 second of the CPU in action.
![A video showing 30 second of the CPU in action.](https://raw.githubusercontent.com/JacobPuff/rocks-into-computers/main/exampleFullCPU.webp)