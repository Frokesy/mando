CREATE TABLE IF NOT EXISTS  rider_service_areas (
  rider_id uuid NOT NULL,
  service_area_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rider_service_areas_rider_id_service_area_id_pk PRIMARY KEY(rider_id,service_area_id)
);
--> statement-breakpoint
ALTER TABLE rider_service_areas DROP CONSTRAINT IF EXISTS rider_service_areas_rider_id_users_id_fk;
--> statement-breakpoint
ALTER TABLE rider_service_areas ADD CONSTRAINT rider_service_areas_rider_id_users_id_fk FOREIGN KEY (rider_id) REFERENCES public.users(id) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE rider_service_areas DROP CONSTRAINT IF EXISTS rider_service_areas_service_area_id_service_areas_id_fk;
--> statement-breakpoint
ALTER TABLE rider_service_areas ADD CONSTRAINT rider_service_areas_service_area_id_service_areas_id_fk FOREIGN KEY (service_area_id) REFERENCES public.service_areas(id) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rider_service_areas_service_area_id_index ON rider_service_areas USING btree (service_area_id);
