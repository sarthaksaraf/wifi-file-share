import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const fetchChannels = async () => {
    const res = await axios.get('/api/channels');
    setChannels(res.data);
  };

  const fetchChannelData = async (channel) => {
    const res = await axios.get(`/api/channel/${channel}`);
    setNotes(res.data.notes);
    setFiles(res.data.files);
  };

  useEffect(() => {
    fetchChannels();
    fetchChannelData(currentChannel);
  }, [currentChannel]);

  const saveText = async () => {
    await axios.post(`/api/channel/${currentChannel}/save_text`, { text_content: notes });
    alert('✅ Text saved!');
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    await axios.post(`/api/channel/${currentChannel}/upload`, formData);
    fetchChannelData(currentChannel);
  };

  const deleteFile = async (filename) => {
    if (window.confirm('Delete this file?')) {
      await axios.delete(`/api/channel/${currentChannel}/delete_file/${filename}`);
      fetchChannelData(currentChannel);
    }
  };

  const deleteChannel = async (channel) => {
    if (channel === 'general') return alert("Cannot delete 'general'");
    if (window.confirm('Delete entire channel?')) {
      await axios.delete(`/api/channel/${channel}/delete`);
      fetchChannels();
      setCurrentChannel('general');
    }
  };

  const createChannel = async (e) => {
    e.preventDefault();
    const name = e.target.new_chan.value.trim();
    if (name) {
      await axios.post('/api/create_channel', { new_chan: name });
      fetchChannels();
      setCurrentChannel(name);
      e.target.reset();
    }
  };

  // Drag & Drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div className="sidebar">
        <h3>Channels</h3>
        {channels.map(c => (
          <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
            <a href="#" onClick={() => setCurrentChannel(c)} style={{ fontSize: '16px', color: currentChannel === c ? '#4fc1ff' : '#d4d4d4' }}>
              # {c}
            </a>
            {c !== 'general' && (
              <a href="#" onClick={(e) => { e.stopPropagation(); deleteChannel(c); }} style={{ color: '#666', fontSize: '12px' }}>×</a>
            )}
          </div>
        ))}

        <hr style={{ border: '0', borderTop: '1px solid #333', margin: '20px 0' }} />

        <form onSubmit={createChannel}>
          <input type="text" name="new_chan" placeholder="New Channel" required style={{ width: '75%', background: '#333', border: '1px solid #444', color: 'white', padding: '5px' }} />
          <button type="submit" style={{ padding: '5px 10px' }}>+</button>
        </form>
      </div>

      {/* Main Area */}
      <div className="main">
        <h2># {currentChannel}</h2>

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />

        <button onClick={saveText} style={{ marginTop: '10px' }}>SAVE TEXT</button>

        {/* Drop Zone */}
        <div
          id="drop-zone"
          className={isDragging ? 'hover' : ''}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{ marginTop: '20px' }}
        >
          Drag &amp; Drop Files Here
          <div style={{ fontSize: '12px', marginTop: '5px' }}>— OR —</div>
          <label className="btn-label">
            CHOOSE FILE
            <input
              type="file"
              onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>

        <h3>Files</h3>
        <div className="file-list">
          {files.map(f => (
            <div key={f} className="file-card">
              {/\.(png|jpg|jpeg|gif|webp)$/i.test(f) && (
                <img src={`/api/channel/${currentChannel}/uploads/${f}`} alt={f} />
              )}
              <a href={`/api/channel/${currentChannel}/uploads/${f}`} target="_blank" rel="noopener noreferrer">
                {f}
              </a>
              <a href="#" className="delete-btn" onClick={() => deleteFile(f)}>DELETE</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;