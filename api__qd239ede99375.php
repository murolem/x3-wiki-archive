<!DOCTYPE HTML>
<html>
<head>
	<title>MediaWiki API</title>
</head>
<body>
<br />
<small>
You are looking at the HTML representation of the XML format.<br />
HTML is good for debugging, but probably is not suitable for your application.<br />
See <a href='https://www.mediawiki.org/wiki/API'>complete documentation</a>, or
<a href='/api.php'>API help</a> for more information.
</small>
<pre>
<span style="color:blue;">&lt;?xml version=&quot;1.0&quot;?&gt;</span>
<span style="color:blue;">&lt;api&gt;</span>
  <span style="color:blue;">&lt;help&gt;</span>
    <span style="color:blue;">&lt;module&gt;</span><b>* action=protect *</b>
  Change the protection level of a page

This module requires read rights
This module requires write rights
This module only accepts POST requests
Parameters:
  title               - Title of the page you want to (un)protect
                        This parameter is required
  token               - A protect token previously retrieved through prop=info
  protections         - Pipe-separated list of protection levels, formatted action=group (e.g. edit=sysop)
                        This parameter is required
  expiry              - Expiry timestamps. If only one timestamp is set, it'll be used for all protections.
                        Use 'infinite', 'indefinite' or 'never', for a neverexpiring protection.
                        Default: infinite
  reason              - Reason for (un)protecting (optional)
                        Default: 
  cascade             - Enable cascading protection (i.e. protect pages included in this page)
                        Ignored if not all protection levels are 'sysop' or 'protect'
  watch               - DEPRECATED! If set, add the page being (un)protected to your watchlist
  watchlist           - Unconditionally add or remove the page from your watchlist, use preferences or do not change watch
                        One value: watch, unwatch, preferences, nochange
                        Default: preferences
Examples:
  <a href="api.php?action=protect&amp;title=Main%20Page&amp;token=123ABC&amp;protections=edit=sysop|move=sysop&amp;cascade=&amp;expiry=20070901163000|never">api.php?action=protect&amp;title=Main%20Page&amp;token=123ABC&amp;protections=edit=sysop|move=sysop&amp;cascade=&amp;expiry=20070901163000|never</a>
  <a href="api.php?action=protect&amp;title=Main%20Page&amp;token=123ABC&amp;protections=edit=all|move=all&amp;reason=Lifting%20restrictions">api.php?action=protect&amp;title=Main%20Page&amp;token=123ABC&amp;protections=edit=all|move=all&amp;reason=Lifting%20restrictions</a>
Help page:
  <a href="https://www.mediawiki.org/wiki/API:Protect">https://www.mediawiki.org/wiki/API:Protect</a>
<span style="color:blue;">&lt;/module&gt;</span>
  <span style="color:blue;">&lt;/help&gt;</span>
<span style="color:blue;">&lt;/api&gt;</span>
</pre>
</body>
</html>
<!-- Served in 0.070 secs. -->