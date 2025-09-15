import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new knowledge area.
 *
 * This operation allows an authenticated employee to create a knowledge area in
 * the job performance evaluation system. Requires unique code, name, and
 * optionally description.
 *
 * @param props - Object containing the employee payload and creation body
 * @param props.employee - Authenticated employee payload
 * @param props.body - Creation info for knowledge area
 * @returns The created knowledge area record with timestamps
 * @throws {Error} Throws on database or Prisma client errors
 */
export async function postjobPerformanceEvalEmployeeKnowledgeAreas(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalKnowledgeArea.ICreate;
}): Promise<IJobPerformanceEvalKnowledgeArea> {
  const { employee, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.job_performance_eval_knowledge_areas.create({
      data: {
        id: v4(),
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
