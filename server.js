const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ═══════════ 配置 ═══════════
const SPEAKERS = [
  { seq: 1,  king: 'Amy',     angel: 'Luna',     type: 'relief',    typeLabel: '减负成果' },
  { seq: 2,  king: 'Amy',     angel: '谢总',     type: 'treasure',  typeLabel: '寻宝成果' },
  { seq: 3,  king: '王芬',    angel: 'Tyra',     type: 'reuse',     typeLabel: '复用成果' },
  { seq: 4,  king: 'Ann',     angel: 'Tyra',     type: 'discovery', typeLabel: '宝藏成果' },
  { seq: 5,  king: 'Luna',    angel: 'Ann',      type: 'relief',    typeLabel: '减负成果' },
  { seq: 6,  king: 'Rena',    angel: 'Alice',    type: 'relief',    typeLabel: '减负成果' },
  { seq: 7,  king: 'Rena',    angel: 'Bella',    type: 'treasure',  typeLabel: '寻宝成果' },
  { seq: 8,  king: 'Bella',   angel: 'Tyra',     type: 'relief',    typeLabel: '减负成果' },
  { seq: 9,  king: '业务部',  angel: 'Amy',      type: 'relief',    typeLabel: '减负成果' },
  { seq: 10, king: 'Alice',   angel: 'Vian',     type: 'relief',    typeLabel: '减负成果' },
];

const HALO_INFO = {
  relief:    { icon: '🌿', label: '减负光环', desc: '为伙伴减负，提升效率' },
  treasure:  { icon: '🔍', label: '寻宝光环', desc: '发现伙伴亮点，挖掘价值' },
  reuse:     { icon: '♻️', label: '复用光环', desc: '经验复用，成果共享' },
  discovery: { icon: '💎', label: '宝藏光环', desc: '发现宝藏，成果丰硕' },
  adviser:   { icon: '🧠', label: '智囊光环', desc: '智囊贡献，智慧加持' },
};

// ═══════════ 状态 ═══════════
let state = {
  scores: {},       // { name: { relief: n, treasure: n, ... } }
  log: [],          // { time, name, role, halo, awarder, speaker, text }
  speakerIdx: 0,
  roundHaloCount: {},  // { name: count }
};

let onlineUsers = {};  // socketId -> { name }
const DATA_FILE = path.join(__dirname, 'data.json');

function saveData() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2)); } catch(e) {}
}
function loadData() {
  try { if (fs.existsSync(DATA_FILE)) state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
}
loadData();

// ═══════════ 静态文件 ═══════════
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════ API ═══════════
app.get('/api/state', (req, res) => {
  res.json({ speakers: SPEAKERS, state: state, onlineCount: Object.keys(onlineUsers).length });
});

app.post('/api/reset', express.json(), (req, res) => {
  state = { scores: {}, log: [], speakerIdx: 0, roundHaloCount: {} };
  saveData();
  io.emit('state_update', state);
  res.json({ ok: true });
});

app.post('/api/next-speaker', express.json(), (req, res) => {
  if (state.speakerIdx < SPEAKERS.length - 1) {
    state.speakerIdx++;
    state.roundHaloCount = {};
    saveData();
    io.emit('state_update', state);
    io.emit('speaker_changed', { speakerIdx: state.speakerIdx, speaker: SPEAKERS[state.speakerIdx] });
  }
  res.json({ ok: true, speakerIdx: state.speakerIdx });
});

app.post('/api/jump-speaker', express.json(), (req, res) => {
  const idx = parseInt(req.body.idx);
  if (!isNaN(idx) && idx >= 0 && idx < SPEAKERS.length) {
    state.speakerIdx = idx;
    state.roundHaloCount = {};
    saveData();
    io.emit('state_update', state);
    io.emit('speaker_changed', { speakerIdx: state.speakerIdx, speaker: SPEAKERS[state.speakerIdx] });
  }
  res.json({ ok: true, speakerIdx: state.speakerIdx });
});

// ═══════════ Socket.io ═══════════
io.on('connection', (socket) => {
  console.log('📱 用户连接', socket.id);

  socket.on('join', (name) => {
    onlineUsers[socket.id] = { name: name || '匿名' };
    io.emit('online_count', Object.keys(onlineUsers).length);
    socket.emit('state_update', state);
    socket.emit('speaker_changed', { speakerIdx: state.speakerIdx, speaker: SPEAKERS[state.speakerIdx] });
  });

  socket.on('award_halo', (data) => {
    const { name, haloType, displayRole } = data;
    const awarder = onlineUsers[socket.id]?.name || '匿名';

    // 更新分数
    if (!state.scores[name]) state.scores[name] = {};
    if (!state.scores[name][haloType]) state.scores[name][haloType] = 0;
    state.scores[name][haloType]++;

    // 本轮计数
    if (!state.roundHaloCount[name]) state.roundHaloCount[name] = 0;
    state.roundHaloCount[name]++;

    // 日志
    const d = new Date();
    const time = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    const sp = SPEAKERS[state.speakerIdx];
    const logItem = {
      time,
      name,
      role: displayRole,
      halo: haloType,
      awarder,
      speaker: sp ? ('#' + sp.seq + ' ' + sp.king + '×' + sp.angel) : '',
      text: awarder + ' 为 ' + name + '（' + displayRole + '）点亮了 ' + HALO_INFO[haloType].icon + ' ' + HALO_INFO[haloType].label,
    };
    state.log.unshift(logItem);
    if (state.log.length > 500) state.log = state.log.slice(0, 500);

    saveData();

    // 先广播最新状态（确保所有人状态一致）
    io.emit('state_update', state);

    // 再广播点亮事件（触发动画）
    io.emit('halo_awarded', {
      awarder,
      name,
      displayRole,
      haloType,
      haloInfo: HALO_INFO[haloType],
      time,
    });
  });

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('online_count', Object.keys(onlineUsers).length);
    console.log('📱 用户断开', socket.id);
  });
});

app.post('/api/reset', express.json(), (req, res) => {
  state = {
    scores: {},
    log: [],
    speakerIdx: 0,
    roundHaloCount: {},
  };
  saveData();
  io.emit('state_update', state);
  io.emit('halo_reset');
  console.log('🔄 状态已重置');
  res.json({ ok: true });
});

// ═══════════ 启动 ═══════════
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ 天使光环点亮工具启动成功！\n');
  console.log('📱 用户页： http://localhost:' + PORT);
  console.log('🖥  大屏页： http://localhost:' + PORT + '/admin.html\n');
});
