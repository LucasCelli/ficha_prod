"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/features/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveMonthlyGoalAction(formData: FormData) {
  await requireSuperadmin();
  const userId=text(formData,"userId"), month=text(formData,"month");
  const fichas=Math.max(0,Number(text(formData,"fichas"))||0), pieces=Math.max(0,Number(text(formData,"pieces"))||0);
  if(!userId||!/^\d{4}-\d{2}-01$/.test(month)) redirect("/usuarios/perfis?toast=invalid");
  const {error}=await createServerSupabaseClient().from("user_monthly_goals").upsert({user_id:userId,month,fichas_target:fichas,pieces_target:pieces},{onConflict:"user_id,month"});
  if(error) redirect(errorHref(error.message));
  revalidateAll(); redirect("/usuarios/perfis?toast=goal-saved");
}

export async function assignFichaOwnerAction(formData: FormData) {
  const session=await requireSuperadmin();
  const userId=text(formData,"userId"), reason=text(formData,"reason");
  const ids=[...new Set(formData.getAll("fichaIds").map(String).map((v)=>v.trim()).filter(Boolean))];
  if(!userId||!ids.length||reason.length<5||formData.get("confirmed")!=="on") redirect("/usuarios/perfis?toast=invalid");
  const supabase=createServerSupabaseClient();
  const {data:rows,error:lookupError}=await supabase.from("fichas").select("id,created_by_user_id").in("id",ids);
  if(lookupError) redirect(errorHref(lookupError.message));
  const changed=(rows??[]).filter((row)=>row.created_by_user_id!==userId);
  if(!changed.length) redirect("/usuarios/perfis?toast=unchanged");
  const changedIds=changed.map((row)=>row.id);
  const {error}=await supabase.from("fichas").update({created_by_user_id:userId}).in("id",changedIds);
  if(error) redirect(errorHref(error.message));
  const {error:auditError}=await supabase.from("ficha_ownership_audit").insert(changed.map((row)=>({
    ficha_id:row.id,previous_user_id:row.created_by_user_id,new_user_id:userId,changed_by_user_id:session.user.id,reason,
  })));
  if(auditError) {
    await Promise.all(changed.map((row)=>supabase.from("fichas").update({created_by_user_id:row.created_by_user_id}).eq("id",row.id)));
    redirect(errorHref(`Auditoria não registrada: ${auditError.message}`));
  }
  revalidateAll(); redirect(`/usuarios/perfis?toast=${changed.length>1?"owners-saved":"owner-saved"}`);
}
function revalidateAll(){revalidatePath("/meu-painel");revalidatePath("/fichas");revalidatePath("/usuarios/perfis");}
function errorHref(message:string){return `/usuarios/perfis?toast=error&message=${encodeURIComponent(message)}`;}
function text(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
