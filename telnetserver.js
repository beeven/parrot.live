const fs = require('mz/fs');
const http = require('http');
const {Readable} = require('stream');
const colors = require('colors/safe');
const net = require('net');

const frames = [];

// Setup frames in memory
fs.readdir('./frames').then(data => { 
  data.forEach(async frame => {
    const f = await fs.readFile(`./frames/${frame}`);
    frames.push(f.toString());
  })
});

const colorsOptions = ['red', 'yellow', 'green', 'blue', 'magenta', 'cyan', 'white'];
const numColors = colorsOptions.length;

const streamer = stream => {
  let index = 0;
  let lastColor = -1;
  let newColor = 0;
  return setInterval(() => {
    if (index >= frames.length) index = 0; stream.push('\033[H\033[J');

    newColor = Math.floor(Math.random() * numColors);

    // Reroll for a new color if it was the same as last frame
    if(newColor == lastColor) {
      newColor += (1 + Math.floor(Math.random() * (numColors - 1)));
      newColor %= numColors;
    }

    lastColor = newColor;
    stream.push(colors[colorsOptions[newColor]](frames[index]));

    index++;
  }, 70);
}


const tlnserver = net.createServer((sock)=>{

    console.log(`${sock.remoteAddress} connected.`)

    const stream = new Readable();
    stream._read = function noop () {};
    stream.pipe(sock);
    const interval = streamer(stream);

    sock.on('close', (hadError)=>{
        stream.destroy();
        clearInterval(interval);
        console.log(`${sock.remoteAddress} disconnected.`);
    });

    sock.on('error', (err)=>{

    });
});

const server = http.createServer((req, res) => {
  if (req.headers && req.headers['user-agent'] && !req.headers['user-agent'].includes('curl')) {
    res.writeHead(302, {'Location': 'https://github.com/hugomd/parrot.live'});
    return res.end();
  }
  const stream = new Readable();
  stream._read = function noop () {};
  stream.pipe(res);
  const interval = streamer(stream);

  req.on('close', () => {
    stream.destroy();
    clearInterval(interval);
  });
});


const port = process.env.PARROT_PORT || 3000;
server.listen(port, err => {
  if (err) throw err;
  console.log(`Listening on localhost:${port}`);
});

tlnserver.listen(3001, '0.0.0.0', err => {
    if (err) throw err;
  console.log(`Telnet server listening on localhost: 3001`);
});