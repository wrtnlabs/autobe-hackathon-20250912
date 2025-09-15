import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

export async function getjobPerformanceEvalEmployeeEmployeeCommentsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEmployeeComments> {
  const { employee, id } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_employee_comments.findUniqueOrThrow(
      {
        where: { id },
        select: {
          id: true,
          employee_id: true,
          evaluation_cycle_id: true,
          comment: true,
          created_at: true,
          updated_at: true,
        },
      },
    );

  return {
    id: record.id,
    employee_id: record.employee_id,
    evaluation_cycle_id: record.evaluation_cycle_id,
    comment: record.comment,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
