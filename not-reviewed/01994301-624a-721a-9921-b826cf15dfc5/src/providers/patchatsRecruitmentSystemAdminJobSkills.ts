import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { IPageIAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobSkill";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a filtered, paginated list of job skills for recruitment postings
 * (ats_recruitment_job_skills table).
 *
 * This endpoint enables system administrators (systemadmin role) to retrieve a
 * paginated and filterable list of job skills used for recruitment postings.
 * Skills can be searched by name (partial, case-insensitive),
 * activated/inactivated state, and creation date, with configurable sort and
 * pagination. Only non-deleted (deleted_at: null) skills are returned. Access
 * is available to systemadmin role only (enforced by decorator).
 *
 * @param props - Function parameter object
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - Request body with filters for name, status, date,
 *   pagination, sort fields
 * @returns Paginated summary of job skills matching search and filter criteria
 * @throws {Error} When pagination parameters are missing or invalid (page < 1,
 *   limit < 1)
 */
export async function patchatsRecruitmentSystemAdminJobSkills(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobSkill.IRequest;
}): Promise<IPageIAtsRecruitmentJobSkill.ISummary> {
  const { body } = props;

  // Pagination (must be >=1)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  if (page < 1 || limit < 1) {
    throw new Error("Invalid pagination: page and limit must be >= 1");
  }

  // Allowed sort fields; anything else falls back to created_at
  const allowedSortBy = ["id", "name", "is_active", "created_at", "updated_at"];
  const sortBy = allowedSortBy.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortDir = body.sort_dir === "asc" ? "asc" : "desc";

  // Build where conditions (strictly from schema)
  const where = {
    deleted_at: null,
    ...(typeof body.name === "string" &&
      body.name.length > 0 && { name: { contains: body.name } }),
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...(body.created_from && { created_at: { gte: body.created_from } }),
    ...(body.created_to && {
      created_at: {
        ...(body.created_from && { gte: body.created_from }),
        lte: body.created_to,
      },
    }),
  };

  // Compose orderBy inline per rules
  const orderBy = { [sortBy]: sortDir };

  // Query and count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_skills.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_job_skills.count({ where }),
  ]);

  // Map DB rows to API Summary
  const data = rows.map(
    (skill): IAtsRecruitmentJobSkill.ISummary => ({
      id: skill.id,
      name: skill.name,
      description: skill.description !== null ? skill.description : undefined,
      is_active: skill.is_active,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
