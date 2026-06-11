export const runtime = 'nodejs';
export const maxDuration = 60;
export const preferredRegion = 'hkg1';

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const ARK_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

const MODEL_MAP: Record<string, { modelId: string; allowedSizes: Set<string> }> = {
  '5.0-lite': { modelId: 'doubao-seedream-5-0-260128', allowedSizes: new Set(['2K', '3K', '4K']) },
  '4.5':      { modelId: 'doubao-seedream-4-5-251128', allowedSizes: new Set(['2K', '4K']) },
};
const DEFAULT_MODEL = '4.5';

type Mode = 'text' | 'img' | 'imgs';

interface ArkGenerationRequest {
  model: string;
  prompt: string;
  sequential_image_generation: 'disabled' | 'enabled';
  response_format: 'url' | 'b64_json';
  size: '2K' | '3K' | '4K' | (string & {});
  stream: boolean;
  watermark: boolean;
  image?: string | string[];
}

type ArkItem = { url?: string };
interface ArkResponse {
  data?: ArkItem[];
  error?: unknown;
  [k: string]: unknown;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let mode: Mode = 'text';
    let prompt = '';
    let model = 'doubao-seedream-4-5-251128';
    let modelKey = DEFAULT_MODEL;
    let size: string = '2K';
    let watermark: boolean = false; // 默认 false
    let imageUrls: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      mode = String(form.get('mode') || 'text') as Mode;
      prompt = String(form.get('prompt') || '');
      modelKey = String(form.get('model') || DEFAULT_MODEL);
      const modelCfg = MODEL_MAP[modelKey] || MODEL_MAP[DEFAULT_MODEL];
      model = modelCfg.modelId;
      size = String(form.get('size') || '2K');
      watermark = String(form.get('watermark') ?? 'false') === 'true';

      if (!modelCfg.allowedSizes.has(size)) size = '2K';

      const urlsFromForm = form.getAll('imageUrls').map(String).filter(Boolean);
      imageUrls.push(...urlsFromForm);

      const files = form.getAll('files').filter((f): f is File => f instanceof File);
      if (files.length > 0) {
        try {
          const ossRegion = process.env.OSS_REGION || '';
          const ossBucket = process.env.OSS_BUCKET || '';
          const s3 = new S3Client({
            region: ossRegion,
            endpoint: `https://oss-${ossRegion}.aliyuncs.com`,
            credentials: {
              accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.OSS_ACCESS_KEY_SECRET || '',
            },
            forcePathStyle: false,
          });
          for (const file of files) {
            const buf = Buffer.from(await file.arrayBuffer());
            const key = `uploads/${Date.now()}-${file.name}`;
            await s3.send(new PutObjectCommand({
              Bucket: ossBucket,
              Key: key,
              Body: buf,
              ContentType: file.type,
            }));
            imageUrls.push(`https://${ossBucket}.oss-${ossRegion}.aliyuncs.com/${key}`);
          }
        } catch (uploadErr) {
          console.error('[OSS Upload Error]', uploadErr);
          return NextResponse.json(
            { error: '文件上传失败：请检查 OSS 配置（region/accessKeyId/accessKeySecret/bucket）是否正确。' },
            { status: 501 }
          );
        }
      }
    } else {
      const body = await req.json() as {
        mode?: Mode;
        prompt?: string;
        model?: string;
        size?: string;
        watermark?: boolean;
        imageUrls?: string[] | string;
      };
      mode = (body.mode || 'text') as Mode;
      prompt = body.prompt || '';
      modelKey = body.model || DEFAULT_MODEL;
      const modelCfg = MODEL_MAP[modelKey] || MODEL_MAP[DEFAULT_MODEL];
      model = modelCfg.modelId;
      size = body.size || '2K';
      watermark = body.watermark ?? false;

      if (!modelCfg.allowedSizes.has(size)) size = '2K';

      imageUrls = Array.isArray(body.imageUrls)
        ? body.imageUrls
        : body.imageUrls
        ? [body.imageUrls]
        : [];
    }

    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt' }, { status: 400 });
    }

    const payload: ArkGenerationRequest = {
      model,
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: size as ArkGenerationRequest['size'],
      stream: false,
      watermark,
    };

    const imgs = imageUrls.filter(Boolean);
    if (mode !== 'text' && imgs.length === 0) {
      return NextResponse.json({ error: 'img/imgs 模式需要提供图片' }, { status: 400 });
    }
    if (imgs.length === 1) payload.image = imgs[0];
    if (imgs.length > 1) payload.image = imgs;

    const res = await fetch(ARK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VOLC_API_KEY || ''}`,
      },
      body: JSON.stringify(payload),
    });

    const data: ArkResponse = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || data }, { status: res.status });
    }

    const urls = Array.isArray(data.data)
      ? data.data.map((d) => d.url).filter((u): u is string => Boolean(u))
      : [];

    return NextResponse.json({ images: urls, raw: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

