INSERT INTO loginuser (role,admin_id, password_hash)
VALUES ('admin','a0',crypt('thisisnotstrong', gen_salt('md5')))
