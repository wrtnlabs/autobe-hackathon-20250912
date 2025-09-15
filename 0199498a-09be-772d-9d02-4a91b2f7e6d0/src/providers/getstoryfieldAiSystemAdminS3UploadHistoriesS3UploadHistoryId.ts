import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiS3UploadHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiS3UploadHistory";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve S3 upload history detail (storyfield_ai_s3_upload_histories) by ID.
 *
 * Retrieves complete audit and diagnostic information for a single S3 upload
 * event history record, specified by unique s3UploadHistoryId. This operation
 * enables system administrators to analyze the upload lifecycle, including file
 * metadata, result status, error context, S3 URLs, and related resource links.
 *
 * Access to this endpoint is restricted to authenticated actors with the
 * 'systemAdmin' role. The function throws an error if the record does not exist
 * or is already deleted.
 *
 * @param props - The function arguments
 * @param props.systemAdmin - The authenticated system administrator's payload
 *   for authorization (must be present)
 * @param props.s3UploadHistoryId - The unique UUID identifier for the S3 upload
 *   history record
 * @returns S3 upload history event record, with all metadata/audit fields
 * @throws {Error} If the record does not exist or is soft-deleted
 */
export async function getstoryfieldAiSystemAdminS3UploadHistoriesS3UploadHistoryId(props: {
  systemAdmin: SystemadminPayload;
  s3UploadHistoryId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiS3UploadHistory> {
  const record =
    await MyGlobal.prisma.storyfield_ai_s3_upload_histories.findFirst({
      where: {
        id: props.s3UploadHistoryId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("S3 upload history record not found");
  }
  return {
    id: record.id,
    storyfield_ai_authenticateduser_id:
      record.storyfield_ai_authenticateduser_id !== undefined
        ? record.storyfield_ai_authenticateduser_id
        : undefined,
    storyfield_ai_story_id:
      record.storyfield_ai_story_id !== undefined
        ? record.storyfield_ai_story_id
        : undefined,
    filename: record.filename,
    file_size: record.file_size,
    media_type: record.media_type,
    upload_status: record.upload_status,
    error_message:
      record.error_message !== undefined ? record.error_message : undefined,
    spring_upload_url: record.spring_upload_url,
    s3_object_url:
      record.s3_object_url !== undefined ? record.s3_object_url : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== undefined && record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
