// App.jsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import {
  fetchAuthSession,
  signInWithRedirect,
  signOut
} from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';

// ── Cognito + API config ──
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       'eu-north-1_DPCOuYG5a',
      userPoolClientId: '7e50iclk2vm1fdme4nktf9gnik',
      loginWith: {
        oauth: {
          domain:         'eu-north-1dpcouyg5a.auth.eu-north-1.amazoncognito.com',
          scopes:         ['openid','email','profile'],
          redirectSignIn: ['https://13.60.76.231:5173/'],
          redirectSignOut:['https://13.60.76.231:5173/'],
          responseType:   'code'
        },
        username: true
      }
    }
  }
});

const API_BASE = 'https://kpghe96g2i.execute-api.eu-north-1.amazonaws.com/test/Project';

const STATUS_OPTIONS = [
  { value:'Finished',    label:'Finished',    color:'#43a047' },
  { value:'In Progress', label:'In Progress', color:'#2962ff' },
  { value:'Pending',     label:'Pending',     color:'#fbc02d' },
  { value:'On Hold',     label:'On Hold',     color:'#e53935' },
];

function getStatusInfo(v) {
  return STATUS_OPTIONS.find(o => o.value === v) || { color:'#757575', label:v||'Unknown' };
}

function App() {
  // Auth
  const [authChecked,   setAuthChecked]   = useState(false);
  const [signedIn,      setSignedIn]      = useState(false);
  const [userEmail,     setUserEmail]     = useState('');
  const [userName,      setUserName]      = useState('');
  // Profile card toggle
  const [showProfile,   setShowProfile]   = useState(false);

  // Tasks
  const [tasks,    setTasks]    = useState([]);
  const [apiError, setApiError] = useState(null);

  // Create / Update
  const [showCreate,   setShowCreate]   = useState(false);
  const [showUpdate,   setShowUpdate]   = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [form,         setForm]         = useState({
    title:'', description:'', status:'', due_date:'', assigned_to:''
  });

  // Attachment UI
  const [openedId,       setOpenedId]      = useState(null);
  const [attachments,    setAttachments]   = useState([]);
  const [uploadFile,     setUploadFile]    = useState(null);
  const [uploading,      setUploading]     = useState(false);
  const [attachmentError,setAttachmentError] = useState(null);

  // 1) Authenticate on mount
  useEffect(() => {
    (async() => {
      try {
        const sess = await fetchAuthSession();
        if (sess.tokens?.idToken) {
          setSignedIn(true);
        } else {
          await signInWithRedirect();
        }
      } catch {
        await signInWithRedirect();
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // 2) Once signed in, grab user info
  useEffect(() => {
    if (!signedIn) return;
    (async () => {
      try {
        const sess = await fetchAuthSession();
        setUserEmail(sess.tokens.idToken.payload.email);
        setUserName(sess.tokens.idToken.payload.nickname);
      } catch (err) {
        console.error('Failed to load user info', err);
      }
    })();
  }, [signedIn]);

  // 3) Load tasks
  useEffect(() => {
    if (signedIn) fetchTasks();
  }, [signedIn]);

  // 4) Fetch attachments
  useEffect(() => {
    if (!openedId) {
      setAttachments([]);
      return;
    }
    setAttachmentError(null);
    (async () => {
      try {
        const sess = await fetchAuthSession();
        const res  = await fetch(`${API_BASE}/${openedId}/attachments`, {
          headers: { Authorization:`Bearer ${sess.tokens.accessToken}` }
        });
        if (!res.ok) throw new Error((await res.json()).error || res.statusText);
        const { attachments } = await res.json();
        setAttachments(attachments || []);
      } catch (e) {
        setAttachmentError(e.message);
      }
    })();
  }, [openedId]);

  // Sign out handler
  async function handleSignOut() {
    try {
      await signOut({ global: true });
    } catch (err) {
      console.error('Error signing out:', err);
    }
    window.location.href =
      'https://eu-north-1dpcouyg5a.auth.eu-north-1.amazoncognito.com/login' +
      '?client_id=7e50iclk2vm1fdme4nktf9gnik' +
      '&response_type=code' +
      '&scope=email+openid+profile' +
      '&redirect_uri=https%3A%2F%2F13.60.76.231%3A5173%2F';
  }

  // Fetch tasks
  async function fetchTasks() {
    setApiError(null);
    try {
      const sess = await fetchAuthSession();
      const res  = await fetch(API_BASE, {
        headers: { Authorization:`Bearer ${sess.tokens.accessToken}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const js = await res.json();
      setTasks(Array.isArray(js) ? js : js.tasks || []);
    } catch (e) {
      setApiError(e.message);
    }
  }

  // Create Task
  async function createTask(e) {
    e.preventDefault();
    setApiError(null);
    try {
      const sess = await fetchAuthSession();
      const res  = await fetch(API_BASE, {
        method:'POST',
        headers:{
          Authorization:`Bearer ${sess.tokens.accessToken}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(await res.text());
      setShowCreate(false);
      setForm({ title:'',description:'',status:'',due_date:'',assigned_to:'' });
      fetchTasks();
    } catch(e) {
      setApiError(e.message);
    }
  }

  // Update Task
  async function updateTask(e) {
    e.preventDefault();
    setApiError(null);
    try {
      const sess = await fetchAuthSession();
      const res  = await fetch(`${API_BASE}/${selectedTask.task_id}`, {
        method:'PATCH',
        headers:{
          Authorization:`Bearer ${sess.tokens.accessToken}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(await res.text());
      setShowUpdate(false);
      fetchTasks();
    } catch(e) {
      setApiError(e.message);
    }
  }

  // Delete Task
  async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return;
    setApiError(null);
    try {
      const sess = await fetchAuthSession();
      const res  = await fetch(`${API_BASE}/${id}`, {
        method:'DELETE',
        headers:{ Authorization:`Bearer ${sess.tokens.accessToken}` }
      });
      if (!res.ok) throw new Error(await res.text());
      fetchTasks();
    } catch(e) {
      setApiError(e.message);
    }
  }

  // Upload Attachment
  async function uploadAttachment(taskId) {
    if (!uploadFile) return;
    setUploading(true);
    setAttachmentError(null);
    try {
      const sess = await fetchAuthSession();
      const post = await fetch(`${API_BASE}/${taskId}/attachment`, {
        method:'POST',
        headers:{
          Authorization:`Bearer ${sess.tokens.accessToken}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          taskId: String(taskId),
          fileName: uploadFile.name
        })
      });
      if (!post.ok) throw new Error((await post.json()).error || post.statusText);
      const { uploadUrl, attachmentId } = await post.json();
      const put = await fetch(uploadUrl, {
        method:'PUT',
        headers:{ 'Content-Type':'application/octet-stream' },
        body: uploadFile
      });
      if (!put.ok) throw new Error('S3 upload failed');
      setAttachments(a=>[...a, { attachmentId, fileName: uploadFile.name }]);
      setUploadFile(null);
    } catch(e) {
      setAttachmentError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // Download Attachment
  async function downloadAttachment(taskId, attachmentId) {
    setAttachmentError(null);
    try {
      const sess = await fetchAuthSession();
      const res  = await fetch(
        `${API_BASE}/${taskId}/attachment?taskId=${taskId}&attachmentId=${attachmentId}`, {
          headers:{ Authorization:`Bearer ${sess.tokens.accessToken}` }
        }
      );
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      const { downloadUrl } = await res.json();
      window.open(downloadUrl,'_blank');
    } catch(e) {
      setAttachmentError(e.message);
    }
  }

  // ── Render ──
  if (!authChecked) return <div>Loading…</div>;
  if (!signedIn)   return null;

  return (
    <div style={{ maxWidth:800, margin:'40px auto', fontFamily:'sans-serif', position:'relative' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2>Task Manager 📝</h2>
        <div style={{ position: 'relative' }}>
          <span
            onClick={() => setShowProfile(p => !p)}
            style={{ cursor:'pointer', fontSize:24, marginRight:12 }}
            title="View Profile"
          >👤</span>
          {showProfile && (
            <div style={{
              position: 'absolute',
              top: '36px',
              right: 0,
              background: '#fff',
              border: '1px solid #ccd',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 8,
              padding: 16,
              minWidth: 200,
              zIndex: 1000
            }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Profile</div>
              <div style={{ fontSize: 14, marginBottom: 4 }}><strong>Email:</strong> {userEmail}</div>
              <div style={{ fontSize: 14 }}><strong>Name:</strong> {userName}</div>
              <button
                onClick={handleSignOut}
                style={{
                  marginTop: 12,
                  background: '#e53935',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius:4,
                  cursor:'pointer'
                }}
              >Sign Out</button>
            </div>
          )}
        </div>
      </div>

      {apiError && <div style={{ color:'red' }}>{apiError}</div>}

      <div style={{ textAlign:'right', margin:'12px 0' }}>
        <button onClick={()=>setShowCreate(true)} style={btn}>+ Create Task</button>
      </div>

      {tasks.map(task => {
        const isOpen = openedId === task.task_id;
        const st     = getStatusInfo(task.status);
        return (
          <div key={task.task_id}
               onClick={() => setOpenedId(isOpen ? null : task.task_id)}
               style={{
                 marginBottom:24,
                 padding:    isOpen ? 24 : 16,
                 borderRadius:12,
                 boxShadow:  '0 4px 16px rgba(0,0,0,0.1)',
                 border:     isOpen ? '3px solid #304ffe' : '2px solid transparent',
                 background: isOpen ? '#f0f7ff' : '#fafafa',
                 cursor:     'pointer',
                 transition: 'all .2s'
               }}>
            <h3 style={{ margin:0, fontSize:isOpen?24:18 }}>{task.title}</h3>
            <span style={{
              display:'inline-block',
              padding:'2px 12px',
              borderRadius:12,
              background:st.color,
              color:'#fff',
              margin:'8px 0'
            }}>{st.label}</span>
            <p style={{ margin:'8px 0', color:'#444' }}>{task.description}</p>
            <div style={{ color:'#555' }}>
              Due: {task.due_date?.split('T')[0]||'N/A'} | Assigned to: {task.assigned_to||'N/A'}
            </div>

            {isOpen && (
              <div style={{ marginTop:20, padding:16, background:'#eef6ff', borderRadius:8 }}>
                <h4 style={{ margin:'0 0 8px' }}>📎 Attachments</h4>
                {attachmentError && <div style={{ color:'red' }}>{attachmentError}</div>}
                <input
                  type="file"
                  disabled={uploading}
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>setUploadFile(e.target.files[0])}
                />
                <button
                  onClick={e=>{ e.stopPropagation(); uploadAttachment(task.task_id); }}
                  disabled={!uploadFile||uploading}
                  style={{ ...btn, marginLeft:8 }}
                >
                  {uploading?'Uploading…':'Upload'}
                </button>

                {attachments.length===0
                  ? <div style={{ color:'#999', marginTop:8 }}>No attachments.</div>
                  : attachments.map(a=>(
                    <div key={a.attachmentId} style={{
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center',
                      background:'#d0e7ff',
                      padding:'4px 8px',
                      borderRadius:6,
                      marginTop:8
                    }}>
                      <span>{a.fileName}</span>
                      <button
                        onClick={e=>{ e.stopPropagation(); downloadAttachment(task.task_id,a.attachmentId); }}
                        style={{ ...btn, background:'#2962ff' }}
                      >Download</button>
                    </div>
                  ))
                }

                <div style={{ textAlign:'right', marginTop:12 }}>
                  <button
                    onClick={e=>{ e.stopPropagation();
                      setSelectedTask(task);
                      setForm({
                        title:       task.title,
                        description: task.description,
                        status:      task.status,
                        due_date:    task.due_date?.split('T')[0]||'',
                        assigned_to: task.assigned_to
                      });
                      setShowUpdate(true);
                    }}
                    style={{ ...btn, background:'#03a9f4' }}
                  >Edit</button>
                  <button
                    onClick={e=>{ e.stopPropagation(); deleteTask(task.task_id); }}
                    style={{ ...btn, background:'#e53935' }}
                  >Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showCreate && (
        <Modal title="Create Task" onClose={()=>setShowCreate(false)}>
          <form onSubmit={createTask}>
            {renderFormFields(form,setForm)}
            <div style={{ textAlign:'right', marginTop:12 }}>
              <button type="submit" style={btn}>Create</button>
              <button type="button" onClick={()=>setShowCreate(false)} style={btn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showUpdate && (
        <Modal title="Update Task" onClose={()=>setShowUpdate(false)}>
          <form onSubmit={updateTask}>
            {renderFormFields(form,setForm)}
            <div style={{ textAlign:'right', marginTop:12 }}>
              <button type="submit" style={btn}>Save</button>
              <button type="button" onClick={()=>setShowUpdate(false)} style={btn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// form fields helper
function renderFormFields(form,setForm){
  return ['title','description','status','due_date','assigned_to'].map(key=>{
    if(key==='status'){
      return (
        <select key={key} required value={form.status}
          onChange={e=>setForm(f=>({...f,status:e.target.value}))}
          style={inputStyle}
        >
          <option value="">Select status</option>
          {STATUS_OPTIONS.map(o=>(
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    if(key==='due_date'){
      return (
        <input key={key} type="date" value={form.due_date}
          onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}
          style={inputStyle}
        />
      );
    }
    return (
      <input key={key} type="text" placeholder={key}
        required={key==='title'}
        value={form[key]}
        onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
        style={inputStyle}
      />
    );
  });
}

// Modal wrapper
function Modal({title,children,onClose}){
  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Styles
const modalStyle = {
  position:'fixed',top:0,left:0,width:'100vw',height:'100vh',
  background:'rgba(0,0,0,0.2)',display:'flex',
  alignItems:'center',justifyContent:'center',zIndex:999
};
const modalContentStyle = {
  background:'#fff',padding:20,borderRadius:8,width:320,
  boxShadow:'0 4px 16px rgba(0,0,0,0.2)'
};
const inputStyle = {
  display:'block',width:'100%',margin:'8px 0',
  padding:8,border:'1px solid #ccd',borderRadius:4
};
const btn = {
  marginLeft:8,background:'#304ffe',color:'#fff',
  border:'none',padding:'6px 12px',borderRadius:4,
  cursor:'pointer'
};

createRoot(document.getElementById('root')).render(<App />);
