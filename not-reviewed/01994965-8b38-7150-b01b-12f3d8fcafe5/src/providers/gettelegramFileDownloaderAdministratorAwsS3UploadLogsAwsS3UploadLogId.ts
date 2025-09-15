import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAwsS3UploadLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAwsS3UploadLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve AWS S3 upload log details by its UUID identifier.
 *
 * This operation fetches detailed information for a single AWS S3 upload log,
 * including file metadata, upload status, error messages if any, and
 * timestamps. Access is restricted to authorized administrators.
 *
 * @param props - Object containing the authorized administrator and the UUID of
 *   the AWS S3 upload log to retrieve.
 * @param props.administrator - The authenticated administrator payload.
 * @param props.awsS3UploadLogId - UUID of the AWS S3 upload log entry.
 * @returns The detailed AWS S3 upload log information.
 * @throws {Error} Throws if the AWS S3 upload log entry does not exist.
 */
export async function gettelegramFileDownloaderAdministratorAwsS3UploadLogsAwsS3UploadLogId(props: {
  administrator: AdministratorPayload;
  awsS3UploadLogId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderAwsS3UploadLogs> {
  const { awsS3UploadLogId } = props;

  const found =
    await MyGlobal.prisma.telegram_file_downloader_aws_s3_upload_logs.findUniqueOrThrow(
      {
        where: { id: awsS3UploadLogId },
      },
    );

  return {
    id: found.id,
    file_name: found.file_name,
    file_size_bytes: found.file_size_bytes,
    upload_status: found.upload_status,
    error_message: found.error_message ?? null,
    attempted_at: toISOStringSafe(found.attempted_at),
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
