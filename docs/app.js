const API="http://localhost:3000";

async function loadTemplates(){
 const res=await fetch(API+"/api/templates");
 const data=await res.json();
 document.getElementById("templates").innerHTML=data.map(t=>`
 <div><img src="${t.image}" width="200"><h3>${t.title}</h3>
 <button onclick="repeat('${t.prompt}')">Repeat</button></div>`).join("");
}

function repeat(p){document.getElementById("prompt").value=p;}

async function generate(){
 const res=await fetch(API+"/api/generate-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:prompt.value,quality:quality.value})});
 const data=await res.json();
 document.getElementById("result").innerHTML=`<img src="${data.image}" width="300">`;
}

loadTemplates();
