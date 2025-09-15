import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

export async function getjobPerformanceEvalManagerManagerCommentsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalManagerComments> {
  const { manager, id } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_manager_comments.findFirst({
      where: {
        id,
      },
    });

  if (!record) {
    throw new Error("Manager comment not found");
  }

  if (record.manager_id !== manager.id) {
    throw new Error("Unauthorized: You can only access your own comments");
  }

  return {
    id: record.id,
    manager_id: record.manager_id,
    evaluation_cycle_id: record.evaluation_cycle_id,
    comment: record.comment,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
