import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

export async function getjobPerformanceEvalEmployeeJobGroupsJobGroupIdJobSeriesJobSeriesId(props: {
  employee: EmployeePayload;
  jobGroupId: string & tags.Format<"uuid">;
  jobSeriesId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalJobSeries> {
  const { employee, jobGroupId, jobSeriesId } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_job_series.findFirstOrThrow({
      where: {
        id: jobSeriesId,
        job_group_id: jobGroupId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    job_group_id: record.job_group_id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
