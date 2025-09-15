import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiS3UploadHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiS3UploadHistory";
import { IPageIStoryfieldAiS3UploadHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiS3UploadHistory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated S3 upload histories
 * (storyfield_ai_s3_upload_histories).
 *
 * Enables system administrators to perform advanced filtering and pagination
 * across S3 upload events for operational audit, troubleshooting, and
 * compliance. Supports text, numeric, status, and time-window filters with
 * robust pagination and allowed field sorting.
 *
 * Access is restricted to the 'systemAdmin' role per platform policy; all props
 * are contractually validated via decorators. All date/datetime values are
 * handled as branded ISO strings to maintain API and DTO type integrity.
 *
 * @param props - Parameters for query:
 * @param props.systemAdmin - The authenticated system admin
 *   (SystemadminPayload). Must be present (role-enforced).
 * @param props.body - Filter and pagination/request options per
 *   IStoryfieldAiS3UploadHistory.IRequest.
 * @returns Paginated list of S3 upload history entries conforming to
 *   IPageIStoryfieldAiS3UploadHistory structure. Results and pagination fields
 *   all type-correct; date fields are branded ISO 8601 strings.
 * @throws {Error} If limit exceeds 100; if any critical business logic
 *   inconsistency is detected. (BadRequest)
 */
export async function patchstoryfieldAiSystemAdminS3UploadHistories(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiS3UploadHistory.IRequest;
}): Promise<IPageIStoryfieldAiS3UploadHistory> {
  const { systemAdmin, body } = props;
  // Contract: systemAdmin must be supplied (decorator validates role)
  // Pagination handling with limit enforcement
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (limit > 100) throw new Error("limit cannot exceed 100");
  const skip = (page - 1) * limit;
  // Allowed sort fields; fallback to created_at for any miss
  const allowedSort = [
    "created_at",
    "filename",
    "upload_status",
    "media_type",
    "file_size",
  ];
  const sort_by = allowedSort.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";
  // Build where filter per schema/DTO/filters, skip undefined/null.
  const where = {
    deleted_at: null,
    ...(body.storyfield_ai_authenticateduser_id !== undefined &&
      body.storyfield_ai_authenticateduser_id !== null && {
        storyfield_ai_authenticateduser_id:
          body.storyfield_ai_authenticateduser_id,
      }),
    ...(body.storyfield_ai_story_id !== undefined &&
      body.storyfield_ai_story_id !== null && {
        storyfield_ai_story_id: body.storyfield_ai_story_id,
      }),
    ...(body.filename !== undefined &&
      body.filename.length > 0 && {
        filename: { contains: body.filename },
      }),
    ...(body.media_type !== undefined &&
      body.media_type.length > 0 && {
        media_type: body.media_type,
      }),
    ...(body.upload_status !== undefined &&
      body.upload_status.length > 0 && {
        upload_status: body.upload_status,
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.error_message !== undefined &&
      body.error_message.length > 0 && {
        error_message: { contains: body.error_message },
      }),
  };
  // Query both data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_s3_upload_histories.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_s3_upload_histories.count({ where }),
  ]);
  // Map result to DTOs, ensuring all Date fields become branded ISO strings
  const results = rows.map((row) => {
    return {
      id: row.id,
      storyfield_ai_authenticateduser_id:
        row.storyfield_ai_authenticateduser_id ?? null,
      storyfield_ai_story_id: row.storyfield_ai_story_id ?? null,
      filename: row.filename,
      file_size: row.file_size,
      media_type: row.media_type,
      upload_status: row.upload_status,
      error_message: row.error_message ?? null,
      spring_upload_url: row.spring_upload_url,
      s3_object_url: row.s3_object_url ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    };
  });
  // Pagination math must yield correct type (see Date Type Error Resolution Rules)
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: results,
  };
}
