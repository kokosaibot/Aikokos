import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let templates = [
  {id:1,title:"Car cinematic",image:"https://picsum.photos/500",prompt:"cinematic luxury car",hidden:false}
];

app.get("/api/templates",(req,res)=>res.json(templates));

app.post("/api/generate-image",(req,res)=>{
 let size=1024;
 if(req.body.quality==="2K") size=2048;
 if(req.body.quality==="4K") size=4096;
 res.json({ok:true,image:`https://picsum.photos/${size}`});
});

app.listen(3000,()=>console.log("RUNNING"));
