# Rocks Into Computers
A presentation on some computer internals and how we combine them to do useful things.

This presentation uses [Motion Canvas](https://motioncanvas.io/), a code driven animation software, and takes us from basic logic gates all the way to a full CPU with our own custom instruction set.

The name was inspired by this post from [daisyowl](https://bsky.app/profile/daisyowl.com). I enjoy it a lot.
![Quote of the post from daisyowl that inspired the presentation name that says:
"if you ever code something that 'feels like a hack but it works,' just remember that a CPU is literally a rock that we tricked into thinking"
"not to oversimplify: first you have to flatten the rock and put lightning inside it"](https://raw.githubusercontent.com/JacobPuff/rocks-into-computers/main/Computers_are_rocks_we_tricked_into_thinking.png)

### Running
To view the slides, you need to run the local server in the `compiled/` folder:
- if you're on linux run `runServe`
- if you're on windows, my last solution didnt work, you're gonna have to wait.
- if you're on mac, I haven't tested on mac yet.

Then go to `localhost:8080/presentation.html`, and find the "Video Settings". In the video settings click the dropdown next to "RENDER" and click the "PRESENT" option. Then hit the present button and you're good to go.

You can also `npm install` in the root directory, and run `npm run serve`.

### Finished CPU
A video showing 30 seconds of the finished CPU in action.
![A video showing 30 seconds of the finished CPU in action.](https://raw.githubusercontent.com/JacobPuff/rocks-into-computers/main/exampleFullCPU.webp)
