import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3.10.1'

console.log('Zip Processor Initialized')

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const payload = await req.json()
    const record = payload.record // Trigger payload
    
    // Safety check
    if (!record || record.type !== 'zip_export' || record.status !== 'pending') {
         return new Response(JSON.stringify({ message: 'Ignored' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const jobId = record.id
    const caseId = record.metadata?.case_id
    const orgId = record.org_id
    const userId = record.requester_id

    console.log(`Processing Job ${jobId} for Case ${caseId}`)

    // 1. Update Status to Processing
    // 1. Update Status to Processing (Atomic check)
    const { error: updateError, count } = await supabase
        .from('jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)
        .eq('status', 'pending')
        .select('id', { count: 'exact' })
    
    if (updateError || count === 0) {
        console.log(`Job ${jobId} not found or not pending. Skipping.`)
        return new Response(JSON.stringify({ message: 'Skipped - Job not pending' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 2. Fetch Files
    const { data: files } = await supabase
        .from('case_files')
        .select('file_key, category')
        .eq('case_id', caseId)
    
    if (!files || files.length === 0) {
        throw new Error("No files found for this case")
    }

    // 3. Create Zip
    const zip = new JSZip()
    const folder = zip.folder(`expediente-${caseId.slice(0, 8)}`)

    for (const file of files) {
        // Download file content
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('case-files')
            .download(file.file_key)
        
        if (downloadError) {
            console.error(`Error downloading ${file.file_key}`, downloadError)
            continue
        }
        
        // Add to zip (clean filename)
        const fileName = file.file_key.split('/').pop() || 'unknown'
        folder?.file(`${file.category}/${fileName}`, fileData)
    }

    // 4. Generate Zip Blob
    const zipContent = await zip.generateAsync({ type: 'blob' })
    const zipSize = zipContent.size
    const zipKey = `${orgId}/${caseId}/${Date.now()}-archive.zip`

    // 5. Upload Zip
    const { error: uploadError } = await supabase.storage
        .from('zip-exports')
        .upload(zipKey, zipContent, {
            contentType: 'application/zip',
            upsert: true
        })

    if (uploadError) throw uploadError

    // 6. Complete Job
    // Generate Signed URL immediately? Or just store the key?
    // Let's store the signed url for simplicity for now, valid for 7 days.
    const { data: signed } = await supabase.storage
        .from('zip-exports')
        .createSignedUrl(zipKey, 60 * 60 * 24 * 7) // 7 days

    await supabase.from('jobs').update({ 
        status: 'completed',
        result_url: signed?.signedUrl
    }).eq('id', jobId)

    // 7. Notify User
    await supabase.from('notifications').insert({
        user_id: userId,
        org_id: orgId,
        title: "Exportación Lista",
        message: "Tu archivo ZIP ha sido generado correctamente.",
        type: "success",
        metadata: { link: signed?.signedUrl, external: true }
    })

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error(error)
     // Fail Job
     try {
         const payload = await req.json().catch(() => ({}))
         if (payload.record?.id) {
            await supabase.from('jobs').update({ 
                status: 'failed', 
                error_message: error.message 
            }).eq('id', payload.record.id)
         }
     } catch (e) {}

    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
