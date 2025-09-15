import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { IPageIAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPosting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List, filter, and paginate job postings (ats_recruitment_job_postings)
 *
 * This endpoint returns a paginated, filtered list of job posting summaries
 * from the ATS recruitment system, accessible only by privileged system
 * administrators. Supports advanced search filters (by recruiter, title,
 * employment type, state, visibility, location, deadline/date range, and
 * keyword text) as well as sorting and pagination for administrative/HR
 * business usage.
 *
 * @param props - Object containing the system administrator's authentication
 *   payload and search/pagination filters for job postings.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the search
 * @param props.body - The filter, sort, and pagination criteria for the job
 *   posting list (see IAtsRecruitmentJobPosting.IRequest for all options)
 * @returns Paginated list of job posting summaries per
 *   IPageIAtsRecruitmentJobPosting.ISummary.
 * @throws {Error} Throws when database query fails or if access control is not
 *   satisfied (should not occur except on severe system error, as authorization
 *   is enforced by decorator)
 */
export async function patchatsRecruitmentSystemAdminJobPostings(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobPosting.IRequest;
}): Promise<IPageIAtsRecruitmentJobPosting.ISummary> {
  const allowedSortFields = ["created_at", "title", "application_deadline"];
  const sortField = allowedSortFields.includes(props.body.sort ?? "")
    ? (props.body.sort ?? "created_at")
    : "created_at";
  const sortOrder: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";
  const pageNumber = props.body.page ?? 1;
  const limitNumber = props.body.limit ?? 20;
  const skip = (pageNumber - 1) * limitNumber;

  const where = {
    deleted_at: null,
    ...(props.body.hr_recruiter_id !== undefined &&
      props.body.hr_recruiter_id !== null && {
        hr_recruiter_id: props.body.hr_recruiter_id,
      }),
    ...(props.body.job_employment_type_id !== undefined &&
      props.body.job_employment_type_id !== null && {
        job_employment_type_id: props.body.job_employment_type_id,
      }),
    ...(props.body.job_posting_state_id !== undefined &&
      props.body.job_posting_state_id !== null && {
        job_posting_state_id: props.body.job_posting_state_id,
      }),
    ...(props.body.title !== undefined &&
      props.body.title !== null && { title: { contains: props.body.title } }),
    ...(props.body.description !== undefined &&
      props.body.description !== null && {
        description: { contains: props.body.description },
      }),
    ...(props.body.location !== undefined &&
      props.body.location !== null && {
        location: { contains: props.body.location },
      }),
    ...(props.body.is_visible !== undefined &&
      props.body.is_visible !== null && { is_visible: props.body.is_visible }),
    ...((props.body.date_from !== undefined && props.body.date_from !== null) ||
    (props.body.date_to !== undefined && props.body.date_to !== null)
      ? {
          created_at: {
            ...(props.body.date_from !== undefined &&
              props.body.date_from !== null && { gte: props.body.date_from }),
            ...(props.body.date_to !== undefined &&
              props.body.date_to !== null && { lte: props.body.date_to }),
          },
        }
      : {}),
    ...((props.body.application_deadline_from !== undefined &&
      props.body.application_deadline_from !== null) ||
    (props.body.application_deadline_to !== undefined &&
      props.body.application_deadline_to !== null)
      ? {
          application_deadline: {
            ...(props.body.application_deadline_from !== undefined &&
              props.body.application_deadline_from !== null && {
                gte: props.body.application_deadline_from,
              }),
            ...(props.body.application_deadline_to !== undefined &&
              props.body.application_deadline_to !== null && {
                lte: props.body.application_deadline_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_postings.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limitNumber,
    }),
    MyGlobal.prisma.ats_recruitment_job_postings.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      title: row.title,
      job_posting_state_id: row.job_posting_state_id,
      job_employment_type_id: row.job_employment_type_id,
      location: row.location !== null ? row.location : undefined,
      application_deadline:
        row.application_deadline !== null &&
        row.application_deadline !== undefined
          ? toISOStringSafe(row.application_deadline)
          : undefined,
      is_visible: row.is_visible,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  const pages = Math.ceil(total / limitNumber);
  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(limitNumber),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
