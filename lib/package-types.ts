import type { ServiceType } from "@/types/Services";

export type PackageSession = {
  session_id: string | number;
  title?: string;
  price?: string | number;
  feature?: string;
  is_most_popular?: string;
  mode?: string;
  product?: string;
  cadence?: string;
};

export type PackageData = {
  package_id: string | number;
  title?: string;
  description?: string;
  limited_time?: string;
  sessions?: PackageSession[];
};

export type RelatedPackageCourse = {
  course_id: string;
  course_code: string;
  name?: string;
  full_form?: string;
  image?: string;
  price_range?: string;
};

export type PackageDetailsData = {
  isSuccess?: boolean;
  data?: PackageData[];
  related_courses?: RelatedPackageCourse[];
};

export type PackagesByService = Partial<
  Record<ServiceType, PackageDetailsData | null>
>;
