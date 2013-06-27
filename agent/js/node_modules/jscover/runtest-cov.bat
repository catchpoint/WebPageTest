node bin\jscover lib lib-cov

SET JSCOVER_COV=1

node_modules\.bin\mocha --globals _*jscoverage && node_modules\.bin\mocha --globals _*jscoverage --reporter html-cov > coverage.html