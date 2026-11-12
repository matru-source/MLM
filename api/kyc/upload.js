import { checkOrigin, readBody, requireSession, requireOwner, fail, HttpError } from '../../server/security.js';
import { transaction } from '../../server/database.js';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '15mb' // High limit to allow high-resolution identity proofs & PDFs
    }
  }
};


async function executeKyc(req, res, sql) {
  // Ensure table exists safely
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id VARCHAR PRIMARY KEY,
        member_id VARCHAR NOT NULL,
        doc_key VARCHAR NOT NULL,
        file_name VARCHAR,
        file_type VARCHAR,
        file_size VARCHAR,
        data_url TEXT NOT NULL,
        status VARCHAR DEFAULT 'under_review',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_member_doc UNIQUE (member_id, doc_key)
      );
    `;
  } catch (e) {
    throw e;
  }

  // =========================================================================
  // 1. GET: Retrieve Uploaded KYC Documents
  // =========================================================================
  if (req.method === 'GET') {
    try {
      const { memberId, docKey, all, raw } = req.query || {};

      // 1a. Return all documents across the platform (for Admin)
      if (all === 'true' || all === '1') {
        const rows = await sql`
          SELECT id, member_id, doc_key, file_name, file_type, file_size, data_url, status, updated_at
          FROM kyc_documents
          ORDER BY updated_at DESC;
        `;
        return res.status(200).json({ ok: true, documents: rows });
      }

      // 1b. Specific document for a member
      if (memberId && docKey) {
        const cleanMemId = String(memberId).trim().toLowerCase();
        const cleanDocKey = String(docKey).trim();
        const rows = await sql`
          SELECT id, member_id, doc_key, file_name, file_type, file_size, data_url, status, updated_at
          FROM kyc_documents
          WHERE LOWER(member_id) = ${cleanMemId} AND doc_key = ${cleanDocKey}
          LIMIT 1;
        `;

        if (rows.length === 0) {
          return res.status(404).json({ ok: false, error: 'Document not found' });
        }

        const doc = rows[0];

        // If requested raw stream for preview/download:
        if (raw === 'true' && doc.data_url) {
          const parts = doc.data_url.split(',');
          if (parts.length === 2) {
            const mimeMatch = parts[0].match(/:(.*?);/);
            const contentType = mimeMatch ? mimeMatch[1] : doc.file_type || 'application/octet-stream';
            const buffer = Buffer.from(parts[1], 'base64');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', 'attachment; filename="document"');
            return res.status(200).send(buffer);
          }
        }

        return res.status(200).json({ ok: true, document: doc });
      }

      // 1c. All documents for a specific member
      if (memberId) {
        const cleanMemId = String(memberId).trim().toLowerCase();
        const rows = await sql`
          SELECT id, member_id, doc_key, file_name, file_type, file_size, data_url, status, updated_at
          FROM kyc_documents
          WHERE LOWER(member_id) = ${cleanMemId}
          ORDER BY updated_at DESC;
        `;
        return res.status(200).json({ ok: true, documents: rows });
      }

      return res.status(400).json({ ok: false, error: 'Missing memberId parameter' });
    } catch (err) {
      console.error('[KYC GET Error]:', err);
      throw err;
    }
  }

  // =========================================================================
  // 2. POST: Store / Stream Live KYC Document to Neon PostgreSQL
  // =========================================================================
  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { memberId, docKey, fileInfo } = body;

    if (!memberId || !docKey || !fileInfo || !fileInfo.dataUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required parameters: memberId, docKey, and fileInfo.dataUrl are required'
      });
    }

    try {
      const cleanMemId = String(memberId).trim().toLowerCase();
      const cleanDocKey = String(docKey).trim();
      const docId = `kyc_${cleanMemId}_${cleanDocKey}`;

      // 1. Upsert into persistent kyc_documents table in Neon
      const inserted = await sql`
        INSERT INTO kyc_documents (
          id, member_id, doc_key, file_name, file_type, file_size, data_url, status, updated_at
        ) VALUES (
          ${docId},
          ${cleanMemId},
          ${cleanDocKey},
          ${fileInfo.name || `${cleanDocKey}_document`},
          ${fileInfo.type || 'image/jpeg'},
          ${fileInfo.size || '150 KB'},
          ${fileInfo.dataUrl},
          'under_review',
          NOW()
        )
        ON CONFLICT (member_id, doc_key) DO UPDATE SET
          file_name = EXCLUDED.file_name,
          file_type = EXCLUDED.file_type,
          file_size = EXCLUDED.file_size,
          data_url = EXCLUDED.data_url,
          status = 'under_review',
          updated_at = NOW()
        RETURNING id, member_id, doc_key, file_name, file_type, file_size, status, updated_at;
      `;

      // 2. Atomically update member's kyc_data in members table
      const memberRows = await sql`
        SELECT id, kyc_data FROM members 
        WHERE LOWER(id) = ${cleanMemId} 
           OR LOWER(referral_code) = ${cleanMemId}
           OR LOWER(cs_customer_id) = ${cleanMemId}
        LIMIT 1;
      `;

      if (memberRows.length > 0) {
        const currentKyc = memberRows[0].kyc_data || {};
        const currentDocs = currentKyc.documents || {};

        const updatedDocs = {
          ...currentDocs,
          [cleanDocKey]: `Uploaded (${fileInfo.name || cleanDocKey})`,
          [`${cleanDocKey}Status`]: 'under_review',
          [`${cleanDocKey}Name`]: fileInfo.name || `${cleanDocKey}_document`,
          [`${cleanDocKey}Type`]: fileInfo.type || 'image/jpeg',
          [`${cleanDocKey}Size`]: fileInfo.size || '150 KB',
          [`${cleanDocKey}File`]: fileInfo.dataUrl // Stored in kyc_data for instant serverless retrieval
        };

        const updatedKyc = {
          ...currentKyc,
          documents: updatedDocs,
          verification_status: 'under_review',
          verified_at: null,
          submitted_at: new Date().toISOString()
        };

        await sql`
          UPDATE members
          SET kyc_data = ${JSON.stringify(updatedKyc)}
          WHERE id = ${memberRows[0].id};
        `;
      }

      return res.status(200).json({
        ok: true,
        document: inserted[0],
        message: 'Document securely uploaded and persisted to PostgreSQL cloud database.'
      });
    } catch (err) {
      console.error('[KYC Upload POST Error]:', err);
      throw err;
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

export default async function handler(req, res) {
  try {
    checkOrigin(req);
    const actor = requireSession(req);
    req.body = readBody(req);
    if (!['GET', 'POST'].includes(req.method)) throw new HttpError(405, 'Method not allowed');
    const memberId = req.method === 'GET' ? req.query?.memberId : req.body.memberId;
    if (actor.role !== 'admin' && ['true', '1'].includes(req.query?.all)) throw new HttpError(403, 'Administrator access required');
    if (actor.role !== 'admin' || memberId) requireOwner(actor, memberId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'POST') {
      const file = req.body.fileInfo;
      if (!['pan', 'aadhaar', 'bankAccount', 'addressProof'].includes(req.body.docKey) ||
          !/^data:(image\/(jpeg|png)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(file?.dataUrl || '') ||
          (file?.dataUrl?.length || 0) > 7 * 1024 * 1024) throw new HttpError(400, 'Upload a PDF, JPEG or PNG under 5 MB');
    }
  } catch (error) { return fail(res, error); }


  try {
    const response = await transaction(async sql => {
      const output = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, setHeader(key, value) { this.headers[key] = value; },
        json(body) { if (this.statusCode >= 400) throw new HttpError(this.statusCode, body.error); this.body = body; this.isJson = true; return this; },
        send(body) { this.body = body; return this; } };
      await executeKyc(req, output, sql);
      return output;
    });
    for (const [key, value] of Object.entries(response.headers)) res.setHeader(key, value);
    return response.isJson ? res.status(response.statusCode).json(response.body) : res.status(response.statusCode).send(response.body);
  } catch (error) { return fail(res, error); }
}
