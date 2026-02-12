<!DOCTYPE html>
<html lang="en" dir="ltr" class="client-nojs">
<head>
<title>Manual Trade Run - X3 Wiki</title>
<meta charset="UTF-8" />
<meta name="generator" content="MediaWiki 1.18.0" />
<meta name="robots" content="noindex,nofollow" />
<link rel="alternate" type="application/x-wiki" title="Edit" href="/index.php?title=Manual_Trade_Run&amp;action=edit" />
<link rel="edit" title="Edit" href="/index.php?title=Manual_Trade_Run&amp;action=edit" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="search" type="application/opensearchdescription+xml" href="/opensearch_desc.php" title="X3 Wiki (en)" />
<link rel="EditURI" type="application/rsd+xml" href="http://www.x3wiki.com/api.php?action=rsd" />
<link rel="alternate" type="application/atom+xml" title="X3 Wiki Atom feed" href="/index.php?title=Special:RecentChanges&amp;feed=atom" />
<link rel="stylesheet" href="/load.php?debug=false&amp;lang=en&amp;modules=mediawiki.legacy.commonPrint%2Cshared%7Cskins.monobook&amp;only=styles&amp;skin=monobook&amp;*" />
<!--[if lt IE 5.5000]><link rel="stylesheet" href="/skins/monobook/IE50Fixes.css?303" media="screen" /><![endif]-->
<!--[if IE 5.5000]><link rel="stylesheet" href="/skins/monobook/IE55Fixes.css?303" media="screen" /><![endif]-->
<!--[if IE 6]><link rel="stylesheet" href="/skins/monobook/IE60Fixes.css?303" media="screen" /><![endif]-->
<!--[if IE 7]><link rel="stylesheet" href="/skins/monobook/IE70Fixes.css?303" media="screen" /><![endif]--><meta name="ResourceLoaderDynamicStyles" content="" />
<style>a:lang(ar),a:lang(ckb),a:lang(fa),a:lang(kk-arab),a:lang(mzn),a:lang(ps),a:lang(ur){text-decoration:none}a.new,#quickbar a.new{color:#ba0000}

/* cache key: dailystunt_wiki:resourceloader:filter:minify-css:4:c88e2bcd56513749bec09a7e29cb3ffa */
</style>
<script src="/load.php?debug=false&amp;lang=en&amp;modules=startup&amp;only=scripts&amp;skin=monobook&amp;*"></script>
<script>if(window.mw){
	mw.config.set({"wgCanonicalNamespace": "", "wgCanonicalSpecialPageName": false, "wgNamespaceNumber": 0, "wgPageName": "Manual_Trade_Run", "wgTitle": "Manual Trade Run", "wgCurRevisionId": 6923, "wgArticleId": 1489, "wgIsArticle": true, "wgAction": "view", "wgUserName": null, "wgUserGroups": ["*"], "wgCategories": [], "wgBreakFrames": false, "wgRestrictionEdit": [], "wgRestrictionMove": [], "Geo": {"city": "", "country": ""}, "wgNoticeProject": "wikipedia"});
}
</script><script>if(window.mw){
	mw.loader.load(["mediawiki.page.startup"]);
}
</script>
</head>
<body class="mediawiki ltr sitedir-ltr ns-0 ns-subject page-Manual_Trade_Run action-view skin-monobook">
<div id="globalWrapper">
<div id="column-content"><div id="content">
	<a id="top"></a>
	<div id="siteNotice"><!-- centralNotice loads here --><div id="localNotice" lang="en" dir="ltr"><p><a href="http://www.gamersgate.co.uk/DD-X3AP/x3-albion-prelude-expansion-pack?caff=4628051%7C"><img alt="X3albionP.jpg" src="/images/f/f8/X3albionP.jpg" width="600" height="231" /></a>
</p></div></div>
	<h1 id="firstHeading" class="firstHeading">Manual Trade Run</h1>
	<div id="bodyContent">
		<div id="siteSub">From X3 Wiki</div>
		<div id="contentSub">
				<div id="mw-revision-info">Revision as of 01:06, 13 August 2011 by <a href="/index.php/User:Madned" title="User:Madned" class="mw-userlink">Madned</a>  <span class="mw-usertoollinks">(<a href="/index.php/User_talk:Madned" title="User talk:Madned">Talk</a> | <a href="/index.php/Special:Contributions/Madned" title="Special:Contributions/Madned">contribs</a>)</span></div>

				<div id="mw-revision-nav">(<a href="/index.php?title=Manual_Trade_Run&amp;diff=prev&amp;oldid=6923" title="Manual Trade Run">diff</a>) <a href="/index.php?title=Manual_Trade_Run&amp;direction=prev&amp;oldid=6923" title="Manual Trade Run">← Older revision</a> | Latest revision (diff) | Newer revision → (diff)</div>
			</div>
		<div id="jump-to-nav">Jump to: <a href="#column-one">navigation</a>, <a href="#searchInput">search</a></div>
		<!-- start content -->
<div lang="en" dir="ltr" class="mw-content-ltr"><p>The Manual Trade Run is a command enabled by the <a href="/index.php/Trading_System_Extension" title="Trading System Extension">Trading System Extension</a>.
</p><p>A Manual Trade Run identifies a station the ship should dock to and wares to purchase followed by the identification of a station to sell the specified <a href="/index.php/Wares" title="Wares">trade good</a> at. This run may be designated to repeat indefinitely.
</p>
<h2><span class="editsection">[<a href="/index.php?title=Manual_Trade_Run&amp;action=edit&amp;section=1" title="Edit section: Failure conditions">edit</a>]</span> <span class="mw-headline" id="Failure_conditions"> Failure conditions </span></h2>
<p>Once the command is issued the autopilot takes over but will halt the trade or subsequent trades under certain conditions.
</p><p>The trade run will be halted at the ships point of origin if the designated sale station does not ordinarily purchase the selected product (e.g. weapons sold to a solar power plant). The trade is identified as invalid and the ship will remain at its starting point sending notification that the sale station "doesn't want any of that!"
</p><p>The autopilot may abort the run upon docking at its designated purchase station if the station has run out of stock to conduct the trade.
</p><p>A trade may initiate but will abort at the point of sale station, leaving the ship with unsold goods on hand, under the following circumstances:
</p>
<ul><li> the station has reached capacity for the good being sold
</li><li> the autopilot determines the selling price has dropped below the purchase price
</li></ul>
<p>If any of these failures occur, the autopilot will send a specific notification and remain idle at the station where the trade failure occurred until it is given new orders.
</p>
<!-- 
NewPP limit report
Preprocessor node count: 3/1000000
Post-expand include size: 0/2097152 bytes
Template argument size: 0/2097152 bytes
Expensive parser function count: 0/100
-->

<!-- Saved in parser cache with key dailystunt_wiki:pcache:idhash:1489-0!*!0!*!*!*!* and timestamp 20120112185534 -->
</div><div class="printfooter">
Retrieved from "<a href="http://www.x3wiki.com/index.php?title=Manual_Trade_Run&amp;oldid=6923">http://www.x3wiki.com/index.php?title=Manual_Trade_Run&amp;oldid=6923</a>"</div>
		<div id='catlinks' class='catlinks catlinks-allhidden'></div>		<!-- end content -->
				<div class="visualClear"></div>
	</div>
</div></div>
<div id="column-one">
	<div id="p-cactions" class="portlet">
		<h5>Views</h5>
		<div class="pBody">
			<ul>
				<li id="ca-nstab-main" class="selected"><a href="/index.php/Manual_Trade_Run" title="View the content page [c]" accesskey="c">Page</a></li>
				<li id="ca-talk" class="new"><a href="/index.php?title=Talk:Manual_Trade_Run&amp;action=edit&amp;redlink=1" title="Discussion about the content page [t]" accesskey="t">Discussion</a></li>
				<li id="ca-edit"><a href="/index.php?title=Manual_Trade_Run&amp;action=edit" title="You can edit this page. Please use the preview button before saving [e]" accesskey="e">Edit</a></li>
				<li id="ca-history"><a href="/index.php?title=Manual_Trade_Run&amp;action=history" title="Past revisions of this page [h]" accesskey="h">History</a></li>
			</ul>
		</div>
	</div>
	<div class="portlet" id="p-personal">
		<h5>Personal tools</h5>
		<div class="pBody">
			<ul>
				<li id="pt-login"><a href="/index.php?title=Special:UserLogin&amp;returnto=Manual_Trade_Run&amp;returntoquery=oldid%3D6923" title="You are encouraged to log in; however, it is not mandatory [o]" accesskey="o">Log in / create account</a></li>
			</ul>
		</div>
	</div>
	<div class="portlet" id="p-logo">
		<a title="Visit the main page" style="background-image: url(http://www.x3wiki.com/x3.jpg);" href="/index.php/Main_Page"></a>
	</div>
	<script type="text/javascript"> if (window.isMSIE55) fixalpha(); </script>
	<div class="generated-sidebar portlet" id="p-navigation">
		<h5>Navigation</h5>
		<div class='pBody'>
			<ul>
				<li id="n-mainpage-description"><a href="/index.php/Main_Page" title="Visit the main page [z]" accesskey="z">Main page</a></li>
				<li id="n-recentchanges"><a href="/index.php/Special:RecentChanges" title="A list of recent changes in the wiki [r]" accesskey="r">Recent changes</a></li>
				<li id="n-randompage"><a href="/index.php/Special:Random" title="Load a random page [x]" accesskey="x">Random page</a></li>
				<li id="n-help"><a href="/index.php/Help:Contents" title="The place to find out">Help</a></li>
				<li id="n-To-do-list"><a href="/index.php/To_do_List">To do list</a></li>
			</ul>
		</div>
	</div>
	<div class="generated-sidebar portlet" id="p-X3_Terran_Conflict">
		<h5>X3 Terran Conflict</h5>
		<div class='pBody'>
			<ul>
				<li id="n-Ships"><a href="/index.php/Ships">Ships</a></li>
				<li id="n-Stations"><a href="/index.php/Stations">Stations</a></li>
				<li id="n-Sectors"><a href="/index.php/Sectors">Sectors</a></li>
				<li id="n-Races"><a href="/index.php/Races">Races</a></li>
				<li id="n-Missions"><a href="/index.php/Missions">Missions</a></li>
				<li id="n-Missiles"><a href="/index.php/Missiles">Missiles</a></li>
				<li id="n-Weapons"><a href="/index.php/Weapons">Weapons</a></li>
				<li id="n-Ranks"><a href="/index.php/Ranks">Ranks</a></li>
				<li id="n-Wares"><a href="/index.php/Wares">Wares</a></li>
				<li id="n-Asteroids"><a href="/index.php/Asteroids">Asteroids</a></li>
				<li id="n-Scripts-.26-Mods"><a href="/index.php/Scripts_%26_Mods">Scripts &amp; Mods</a></li>
			</ul>
		</div>
	</div>
	<div class="generated-sidebar portlet" id="p-Links">
		<h5>Links</h5>
		<div class='pBody'>
			<ul>
				<li id="n-Buy-X3-Albion-Prelude.21"><a href="http://www.gamersgate.co.uk/DD-X3AP/x3-albion-prelude-expansion-pack?caff=4628051%7C" rel="nofollow">Buy X3 Albion Prelude!</a></li>
				<li id="n-MMOServerstatus-.5BEN.5D"><a href="http://www.mmoserverstatus.com" rel="nofollow">MMOServerstatus [EN]</a></li>
			</ul>
		</div>
	</div>
	<div id="p-search" class="portlet">
		<h5><label for="searchInput">Search</label></h5>
		<div id="searchBody" class="pBody">
			<form action="/index.php" id="searchform">
				<input type='hidden' name="title" value="Special:Search"/>
				<input type="search" name="search" title="Search X3 Wiki [f]" accesskey="f" id="searchInput" />
				<input type="submit" name="go" value="Go" title="Go to a page with this exact name if exists" id="searchGoButton" class="searchButton" />&#160;
				<input type="submit" name="fulltext" value="Search" title="Search the pages for this text" id="mw-searchButton" class="searchButton" />
			</form>
		</div>
	</div>
	<div class="portlet" id="p-tb">
		<h5>Toolbox</h5>
		<div class="pBody">
			<ul>
				<li id="t-whatlinkshere"><a href="/index.php/Special:WhatLinksHere/Manual_Trade_Run" title="A list of all wiki pages that link here [j]" accesskey="j">What links here</a></li>
				<li id="t-recentchangeslinked"><a href="/index.php/Special:RecentChangesLinked/Manual_Trade_Run" title="Recent changes in pages linked from this page [k]" accesskey="k">Related changes</a></li>
				<li id="t-specialpages"><a href="/index.php/Special:SpecialPages" title="A list of all special pages [q]" accesskey="q">Special pages</a></li>
				<li><a href="/index.php?title=Manual_Trade_Run&amp;oldid=6923&amp;printable=yes" rel="alternate">Printable version</a></li>
				<li id="t-permalink"><a href="/index.php?title=Manual_Trade_Run&amp;oldid=6923" title="Permanent link to this revision of the page">Permanent link</a></li>
			</ul>
		</div>
	</div>
</div><!-- end of the left (by default at least) column -->
<div class="visualClear"></div>
<div id="footer">
	<div id="f-poweredbyico">
		<a href="http://www.mediawiki.org/"><img src="/skins/common/images/poweredby_mediawiki_88x31.png" alt="Powered by MediaWiki" width="88" height="31" /></a>
	</div>
	<ul id="f-list">
		<li id="privacy"><a href="/index.php/X3_Wiki:Privacy_policy" title="X3 Wiki:Privacy policy">Privacy policy</a></li>
		<li id="about"><a href="/index.php/X3_Wiki:About" title="X3 Wiki:About">About X3 Wiki</a></li>
		<li id="disclaimer"><a href="/index.php/X3_Wiki:General_disclaimer" title="X3 Wiki:General disclaimer">Disclaimers</a></li><li><a href='http://installatron.com/apps/mediawiki' target='_blank' title='MediaWiki auto-installer and auto-upgrade service'>Installed by Installatron</a></li>
	</ul>
</div>
</div>
<script>if(window.mw){
	mw.loader.load(["mediawiki.user", "mediawiki.util", "mediawiki.page.ready", "mediawiki.legacy.wikibits", "mediawiki.legacy.ajax"]);
}
</script>
<script type="text/javascript">
var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
</script>
<script type="text/javascript">
try{
var pageTracker = _gat._getTracker("UA-265105-19");
pageTracker._trackPageview();
} catch(err) {}
</script>
<script src="/index.php?title=Special:BannerController&amp;cache=/cn.js&amp;303"></script>
<script>if(window.mw){
	mw.user.options.set({"ccmeonemails":0,"cols":80,"date":"default","diffonly":0,"disablemail":0,"disablesuggest":0,"editfont":"default","editondblclick":0,"editsection":1,"editsectiononrightclick":0,"enotifminoredits":0,"enotifrevealaddr":0,"enotifusertalkpages":1,"enotifwatchlistpages":0,"extendwatchlist":0,"externaldiff":0,"externaleditor":0,"fancysig":0,"forceeditsummary":0,"gender":"unknown","hideminor":0,"hidepatrolled":0,"highlightbroken":1,"imagesize":2,"justify":0,"math":1,"minordefault":0,"newpageshidepatrolled":0,"nocache":0,"noconvertlink":0,"norollbackdiff":0,"numberheadings":0,"previewonfirst":0,"previewontop":1,"quickbar":5,"rcdays":7,"rclimit":50,"rememberpassword":0,"rows":25,"searchlimit":20,"showhiddencats":0,"showjumplinks":1,"shownumberswatching":1,"showtoc":1,"showtoolbar":1,"skin":"monobook","stubthreshold":0,"thumbsize":2,"underline":2,"uselivepreview":0,"usenewrc":0,"watchcreations":0,"watchdefault":0,"watchdeletion":0,"watchlistdays":3,"watchlisthideanons":0,
	"watchlisthidebots":0,"watchlisthideliu":0,"watchlisthideminor":0,"watchlisthideown":0,"watchlisthidepatrolled":0,"watchmoves":0,"wllimit":250,"variant":"en","language":"en","searchNs0":true,"searchNs1":false,"searchNs2":false,"searchNs3":false,"searchNs4":false,"searchNs5":false,"searchNs6":false,"searchNs7":false,"searchNs8":false,"searchNs9":false,"searchNs10":false,"searchNs11":false,"searchNs12":false,"searchNs13":false,"searchNs14":false,"searchNs15":false});;mw.user.tokens.set({"editToken":"+\\","watchToken":false});;mw.loader.state({"user.options":"ready","user.tokens":"ready"});
	
	/* cache key: dailystunt_wiki:resourceloader:filter:minify-js:4:99acc2c3ab516bb21085c70c2195f3df */
}
</script><script type="text/javascript" src="//geoiplookup.wikimedia.org/"></script><!-- Served in 0.205 secs. --></body></html>