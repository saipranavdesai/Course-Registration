SELECT (password_hash = crypt('thisisnotstrong', password_hash)) AS pswmatch 
FROM loginuser 
WHERE admin_id = 'a0' and role = 'admin';