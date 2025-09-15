import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAwsS3UploadLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAwsS3UploadLogs";
import { IPageITelegramFileDownloaderAwsS3UploadLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderAwsS3UploadLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieves a paginated list of AWS S3 upload logs with filtering and sorting
 * capabilities for administrators.
 *
 * This function supports filtering by file name, upload status, and attempted
 * upload date range. Pagination and sorting parameters control the result set.
 *
 * @param props - Object containing the administrator payload and filter body
 * @param props.administrator - The authenticated administrator payload
 * @param props.body - Filter and pagination parameters for AWS S3 upload logs
 * @returns A page summary of AWS S3 upload logs matching the criteria
 * @throws {Error} Throws if database query fails
 */
export async function patchtelegramFileDownloaderAdministratorAwsS3UploadLogs(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderAwsS3UploadLogs.IRequest;
}): Promise<IPageITelegramFileDownloaderAwsS3UploadLogs.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    file_name?: { contains: string };
    upload_status?: string;
    attempted_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
  };

  if (body.file_name !== undefined && body.file_name !== null) {
    where.file_name = { contains: body.file_name };
  }

  if (body.upload_status !== undefined && body.upload_status !== null) {
    where.upload_status = body.upload_status;
  }

  if (
    (body.attempted_at_start !== undefined &&
      body.attempted_at_start !== null) ||
    (body.attempted_at_end !== undefined && body.attempted_at_end !== null)
  ) {
    where.attempted_at = {};
    if (
      body.attempted_at_start !== undefined &&
      body.attempted_at_start !== null
    ) {
      where.attempted_at.gte = body.attempted_at_start;
    }
    if (body.attempted_at_end !== undefined && body.attempted_at_end !== null) {
      where.attempted_at.lte = body.attempted_at_end;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_aws_s3_upload_logs.findMany({
      where,
      orderBy: body.order_by
        ? { [body.order_by]: body.order_direction ?? "asc" }
        : { attempted_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_aws_s3_upload_logs.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      file_name: item.file_name,
      file_size_bytes: item.file_size_bytes,
      upload_status: item.upload_status,
      error_message: item.error_message ?? null,
      attempted_at: toISOStringSafe(item.attempted_at),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
