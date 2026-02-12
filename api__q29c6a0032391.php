<!DOCTYPE HTML>
<html>
<head>
	<title>MediaWiki API</title>
</head>
<body>
<pre>
<span style="color:blue;">&lt;?xml version=&quot;1.0&quot;?&gt;</span>
<span style="color:blue;">&lt;api&gt;</span>
  <span style="color:blue;">&lt;error code=&quot;internal_api_error_DBConnectionError&quot; info=&quot;Exception Caught: DB connection error: Too many connections (localhost)&quot; xml:space=&quot;preserve&quot;&gt;</span>

#0 /home/dailystunt/domains/x3wiki.com/public_html/includes/db/LoadBalancer.php(734): DatabaseBase-&gt;reportConnectionError('Unknown error (...')
#1 /home/dailystunt/domains/x3wiki.com/public_html/includes/db/LoadBalancer.php(494): LoadBalancer-&gt;reportConnectionError(Object(DatabaseMysql))
#2 /home/dailystunt/domains/x3wiki.com/public_html/includes/GlobalFunctions.php(3474): LoadBalancer-&gt;getConnection(-1, 'api', false)
#3 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiQuery.php(143): wfGetDB(-1, 'api')
#4 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiQueryBase.php(384): ApiQuery-&gt;getDB()
#5 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiPageSet.php(419): ApiQueryBase-&gt;getDB()
#6 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiPageSet.php(303): ApiPageSet-&gt;initFromTitles(Array)
#7 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiQuery.php(254): ApiPageSet-&gt;execute()
#8 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiMain.php(711): ApiQuery-&gt;execute()
#9 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiMain.php(360): ApiMain-&gt;executeAction()
#10 /home/dailystunt/domains/x3wiki.com/public_html/includes/api/ApiMain.php(344): ApiMain-&gt;executeActionWithErrorHandling()
#11 /home/dailystunt/domains/x3wiki.com/public_html/api.php(117): ApiMain-&gt;execute()
#12 {main}

<span style="color:blue;">&lt;/error&gt;</span>
<span style="color:blue;">&lt;/api&gt;</span>
</pre>
</body>
</html>
<!-- Served in 0.067 secs. -->