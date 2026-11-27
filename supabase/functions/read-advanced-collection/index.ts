import { withSupabase } from "npm:@supabase/server@1.7.0";
import { handle } from "./core.mjs";
export default {fetch:withSupabase({auth:"user"},async(req,ctx)=>{
 const admin=ctx.supabaseAdmin;
 const userId=ctx.userClaims?.id;
 const bucket=Deno.env.get("NBJB_ADVANCED_COLLECTIONS_PRIVATE_BUCKET");
 const enabled=Deno.env.get("NBJB_ADVANCED_COLLECTIONS_ENABLED")==="true"&&!!bucket;
 const fields="slug,track_slug,lesson_number,title,status,content";
 async function checked(query){const {data,error}=await query;if(error)throw new Error("private_read_failed");return data;}
 return handle(req,userId,{
  enabled,
  member:id=>checked(admin.from("membership_entitlements").select("tier,status,valid_from,valid_until,provider").eq("user_id",id).maybeSingle()),
  catalog:()=>checked(admin.from("flamewalker_premium_lessons").select(fields).eq("track_slug","mythic-resilience").eq("status","published")),
  row:slug=>checked(admin.from("flamewalker_premium_lessons").select(fields).eq("track_slug","mythic-resilience").eq("slug",slug).maybeSingle()),
  read:async key=>{const privateBucket=await checked(admin.storage.getBucket(bucket!));if(privateBucket?.public!==false)throw new Error("private_bucket_required");const {data,error}=await admin.storage.from(bucket!).download(key);if(error||!data)throw new Error("private_asset_failed");return new Uint8Array(await data.arrayBuffer());}
 });
})};
