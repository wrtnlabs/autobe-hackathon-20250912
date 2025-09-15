import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve detailed information of a specific knowledge area by its unique
 * identifier.
 *
 * This operation fetches the full data record from the
 * job_performance_eval_knowledge_areas table representing the knowledge domain
 * relevant to job tasks.
 *
 * Authorization is required through the employee parameter.
 *
 * @param props - Object containing the authenticated employee and the knowledge
 *   area ID
 * @param props.employee - Authenticated employee payload
 * @param props.id - Unique identifier of the knowledge area
 * @returns Detailed knowledge area information conforming to
 *   IJobPerformanceEvalKnowledgeArea
 * @throws {Error} Throws if the specified knowledge area does not exist or is
 *   soft deleted
 */
export async function getjobPerformanceEvalEmployeeKnowledgeAreasId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalKnowledgeArea> {
  const record =
    await MyGlobal.prisma.job_performance_eval_knowledge_areas.findFirstOrThrow(
      {
        where: {
          id: props.id,
          deleted_at: null,
        },
      },
    );

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
