/* Explicit, on-device saves. Nothing leaves the browser. */
window.SessionStore={
  async db(){return new Promise((resolve,reject)=>{const request=indexedDB.open('harmoness-sessions',1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});},
  async run(mode,operation){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction('sessions',mode),request=operation(tx.objectStore('sessions'));tx.oncomplete=()=>{db.close();resolve(request.result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error||Error('Save cancelled'));};});},
  put(value){return this.run('readwrite',s=>s.put(value));},
  get(id){return this.run('readonly',s=>s.get(id));},
  remove(id){return this.run('readwrite',s=>s.delete(id));},
  async list(){const db=await this.db();return new Promise((resolve,reject)=>{const rows=[],tx=db.transaction('sessions','readonly'),request=tx.objectStore('sessions').openCursor();request.onsuccess=()=>{const cursor=request.result;if(cursor){const {id,name,updated,takes}=cursor.value;rows.push({id,name,updated,count:takes.length});cursor.continue();}};tx.oncomplete=()=>{db.close();resolve(rows.sort((a,b)=>b.updated-a.updated));};tx.onerror=()=>{db.close();reject(tx.error);};});}
};
