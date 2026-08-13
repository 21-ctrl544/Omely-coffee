import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function POST(req:Request){
 const body=await req.json();
 if(!body?.table||!Array.isArray(body.items)||body.items.length===0)return NextResponse.json({error:"Invalid order"},{status:400});
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!secret)return NextResponse.json({error:"Server not configured"},{status:500});
 const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,secret,{auth:{persistSession:false}});
 const tableNo=Number(body.table);
 const {data:table}=await supabase.from("tables").select("id").eq("table_number",tableNo).single();
 if(!table)return NextResponse.json({error:"Table not found"},{status:404});
 const subtotal=body.items.reduce((a:any,x:any)=>a+Number(x.p||0),0);
 const code="OM"+Date.now().toString().slice(-7);
 const {data:order,error}=await supabase.from("orders").insert({order_code:code,table_id:table.id,payment_method:body.payment_method==="bank_transfer"?"bank_transfer":"cash",subtotal,total:subtotal}).select("id,order_code").single();
 if(error)return NextResponse.json({error:error.message},{status:500});
 const rows=body.items.map((x:any)=>({order_id:order.id,item_name:String(x.n).slice(0,120),quantity:1,unit_price:Number(x.p||0),line_total:Number(x.p||0),size:x.size,sugar:x.sugar,ice:x.ice,toppings:x.tops||[],note:x.note||null}));
 const {error:itemError}=await supabase.from("order_items").insert(rows);
 if(itemError)return NextResponse.json({error:itemError.message},{status:500});
 await supabase.from("tables").update({status:"occupied"}).eq("id",table.id);
 return NextResponse.json({order_code:order.order_code});
}