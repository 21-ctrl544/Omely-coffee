import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function POST(req:Request){
 const body=await req.json(); const n=Number(body?.table);
 if(!Number.isInteger(n)||n<1||n>20)return NextResponse.json({error:"Invalid table"},{status:400});
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!secret)return NextResponse.json({error:"Server not configured"},{status:500});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,secret,{auth:{persistSession:false}});
 const {data:t}=await db.from("tables").select("id").eq("table_number",n).single();
 if(!t)return NextResponse.json({error:"Table not found"},{status:404});
 const {error}=await db.from("staff_calls").insert({table_id:t.id,message:"Khách gọi nhân viên"});
 if(error)return NextResponse.json({error:error.message},{status:500});
 await db.from("tables").update({status:"needs_staff"}).eq("id",t.id);
 return NextResponse.json({ok:true});
}