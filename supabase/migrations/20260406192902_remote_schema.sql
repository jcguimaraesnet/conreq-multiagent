


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."conjectural_status" AS ENUM (
    'todo',
    'inprogress',
    'done'
);


ALTER TYPE "public"."conjectural_status" OWNER TO "postgres";


CREATE TYPE "public"."evaluation_type" AS ENUM (
    'llm',
    'human'
);


ALTER TYPE "public"."evaluation_type" OWNER TO "postgres";


CREATE TYPE "public"."nfr_category" AS ENUM (
    'interoperability',
    'reliability',
    'performance',
    'availability',
    'scalability',
    'maintainability',
    'portability',
    'security',
    'usability',
    'regulatory',
    'constraint'
);


ALTER TYPE "public"."nfr_category" OWNER TO "postgres";


CREATE TYPE "public"."requirement_type" AS ENUM (
    'functional',
    'non_functional',
    'conjectural'
);


ALTER TYPE "public"."requirement_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_business_need_embeddings"("query_project_id" "uuid", "match_count" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "positive_impact" "text", "embedding" "extensions"."vector")
    LANGUAGE "sql" STABLE
    AS $$SELECT id, business_need, business_need_embedding AS embedding
  FROM conjectural_requirements
  WHERE project_id = query_project_id
    AND business_need_embedding IS NOT NULL
  ORDER BY created_at DESC
  LIMIT match_count;$$;


ALTER FUNCTION "public"."match_business_need_embeddings"("query_project_id" "uuid", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conjectural_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "status" "public"."conjectural_status" DEFAULT 'todo'::"public"."conjectural_status" NOT NULL,
    "desired_behavior" "text" NOT NULL,
    "business_need" "text" NOT NULL,
    "uncertainty" "text" DEFAULT '{}'::"text"[] NOT NULL,
    "solution_assumption" "text" NOT NULL,
    "uncertainty_evaluated" "text" NOT NULL,
    "observation_analysis" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cod_requirement" "text",
    "history_snapshot" "jsonb",
    "user_id" "uuid",
    "business_need_embedding" "extensions"."vector"(1536)
);


ALTER TABLE "public"."conjectural_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "type" "public"."evaluation_type" NOT NULL,
    "unambiguous" integer NOT NULL,
    "completeness" integer NOT NULL,
    "atomicity" integer NOT NULL,
    "verifiable" integer NOT NULL,
    "conforming" integer NOT NULL,
    "overall_score" numeric(3,2) GENERATED ALWAYS AS ((((((("unambiguous" + "completeness") + "atomicity") + "verifiable") + "conforming"))::numeric / (5)::numeric)) STORED NOT NULL,
    "justifications" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attempt" integer,
    "ranking" integer,
    "requirement_snapshot" "jsonb",
    CONSTRAINT "evaluations_atomicity_check" CHECK ((("atomicity" >= 1) AND ("atomicity" <= 5))),
    CONSTRAINT "evaluations_completeness_check" CHECK ((("completeness" >= 1) AND ("completeness" <= 5))),
    CONSTRAINT "evaluations_conforming_check" CHECK ((("conforming" >= 1) AND ("conforming" <= 5))),
    CONSTRAINT "evaluations_unambiguous_check" CHECK ((("unambiguous" >= 1) AND ("unambiguous" <= 5))),
    CONSTRAINT "evaluations_verifiable_check" CHECK ((("verifiable" >= 1) AND ("verifiable" <= 5)))
);


ALTER TABLE "public"."evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "has_completed_onboarding_stage1" boolean DEFAULT false NOT NULL,
    "has_completed_onboarding_stage2" boolean DEFAULT false NOT NULL,
    "has_completed_onboarding_stage3" boolean DEFAULT false NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "is_approved" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" character varying(20),
    "title" "text" NOT NULL,
    "description" "text",
    "vision_document_name" "text",
    "vision_extracted_text" "text",
    "requirements_document_name" "text",
    "vision_document_data" "bytea",
    "requirements_document_data" "bytea",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language" "text",
    "summary" "text",
    "business_domain" "text",
    "business_objective" "text",
    "stakeholder" "text" DEFAULT 'End User'::"text"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."project_id" IS 'Logical project identifier (e.g., PRJ-001)';



COMMENT ON COLUMN "public"."projects"."vision_document_data" IS 'Binary data of the vision document PDF';



COMMENT ON COLUMN "public"."projects"."requirements_document_data" IS 'Binary data of the requirements document PDF';



CREATE TABLE IF NOT EXISTS "public"."requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "requirement_id" "text" NOT NULL,
    "type" "public"."requirement_type" NOT NULL,
    "description" "text" NOT NULL,
    "category" "public"."nfr_category",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "require_brief_description" boolean DEFAULT true NOT NULL,
    "batch_mode" boolean DEFAULT true NOT NULL,
    "quantity_req_batch" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "require_evaluation" boolean DEFAULT true NOT NULL,
    "model" "text" DEFAULT 'gemini'::"text",
    "spec_attempts" integer DEFAULT 3 NOT NULL,
    "model_judge" "text" DEFAULT 'gemini'::"text" NOT NULL,
    CONSTRAINT "settings_quantity_req_batch_check" CHECK ((("quantity_req_batch" >= 1) AND ("quantity_req_batch" <= 50))),
    CONSTRAINT "settings_spec_attempts_check" CHECK ((("spec_attempts" >= 1) AND ("spec_attempts" <= 3)))
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."conjectural_requirements"
    ADD CONSTRAINT "conjectural_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conjectural_requirements"
    ADD CONSTRAINT "conjectural_requirements_project_requirement_id_key" UNIQUE ("project_id", "cod_requirement");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_requirement_id_type_attempt_key" UNIQUE ("requirement_id", "type", "attempt");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_evaluations_requirement" ON "public"."evaluations" USING "btree" ("requirement_id");



CREATE INDEX "idx_profiles_is_approved" ON "public"."profiles" USING "btree" ("is_approved");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_requirements_project_id" ON "public"."requirements" USING "btree" ("project_id");



CREATE INDEX "idx_requirements_type" ON "public"."requirements" USING "btree" ("type");



CREATE OR REPLACE TRIGGER "settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trg_conj_req_updated_at" BEFORE UPDATE ON "public"."conjectural_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_requirements_updated_at" BEFORE UPDATE ON "public"."requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."conjectural_requirements"
    ADD CONSTRAINT "conjectural_requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conjectural_requirements"
    ADD CONSTRAINT "conjectural_requirements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."conjectural_requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_new_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Service role full access conjectural requirements" ON "public"."conjectural_requirements" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access evaluations" ON "public"."evaluations" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can delete own conjectural requirements" ON "public"."conjectural_requirements" FOR DELETE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own evaluations" ON "public"."evaluations" FOR DELETE USING (("requirement_id" IN ( SELECT "cr"."id"
   FROM ("public"."conjectural_requirements" "cr"
     JOIN "public"."projects" "p" ON (("p"."id" = "cr"."project_id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete requirements of own projects" ON "public"."requirements" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "requirements"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own conjectural requirements" ON "public"."conjectural_requirements" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own evaluations" ON "public"."evaluations" FOR INSERT WITH CHECK (("requirement_id" IN ( SELECT "cr"."id"
   FROM ("public"."conjectural_requirements" "cr"
     JOIN "public"."projects" "p" ON (("p"."id" = "cr"."project_id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own settings" ON "public"."settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert requirements to own projects" ON "public"."requirements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "requirements"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own conjectural requirements" ON "public"."conjectural_requirements" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own evaluations" ON "public"."evaluations" FOR UPDATE USING (("requirement_id" IN ( SELECT "cr"."id"
   FROM ("public"."conjectural_requirements" "cr"
     JOIN "public"."projects" "p" ON (("p"."id" = "cr"."project_id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own settings" ON "public"."settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update requirements of own projects" ON "public"."requirements" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "requirements"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own conjectural requirements" ON "public"."conjectural_requirements" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own evaluations" ON "public"."evaluations" FOR SELECT USING (("requirement_id" IN ( SELECT "cr"."id"
   FROM ("public"."conjectural_requirements" "cr"
     JOIN "public"."projects" "p" ON (("p"."id" = "cr"."project_id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own settings" ON "public"."settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view requirements of own projects" ON "public"."requirements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "requirements"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own projects" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."conjectural_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."match_business_need_embeddings"("query_project_id" "uuid", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_business_need_embeddings"("query_project_id" "uuid", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_business_need_embeddings"("query_project_id" "uuid", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";






























GRANT ALL ON TABLE "public"."conjectural_requirements" TO "anon";
GRANT ALL ON TABLE "public"."conjectural_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."conjectural_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."evaluations" TO "anon";
GRANT ALL ON TABLE "public"."evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."requirements" TO "anon";
GRANT ALL ON TABLE "public"."requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."requirements" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


