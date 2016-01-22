var request = require('request');

module.exports = function(url, callback) {
    request(url, function(err, response, body) {
        if (!err) {
            loadInfo(body);

            markers = markers.map(function(m) {
                var comps = m.split(";;");
                var vehicle = {
                    name: comps[0],
                    lat: comps[1],
                    lon: comps[2],
                    time: comps[3],
                    plow: comps[4],
                    salt: comps[5]
                };
                vehicle.contractor = ((vehicle.plow === -1) && (vehicle.salt === -1)) || ((vehicle.plow === 2) && (vehicle.salt === 2));
                vehicle.inactive = ((vehicle.plow === 0) && (vehicle.salt === '0'));
                vehicle.plow = (vehicle.plow === '1');
                vehicle.salt = (vehicle.salt === '1');

                if (vehicle.name.indexOf("HP-") !== -1) {
                    vehicle.type = "Heavy Plow";
                }
                else if (vehicle.name.indexOf("LP-") !== -1) {
                    vehicle.type = "Light Plow";
                }
                else if (vehicle.name.indexOf("CT-") !== -1) {
                    vehicle.type = "Chemical Treatment/Spray";
                }
                else {
                    vehicle.type = "Unclassified";
                }

                return vehicle;
            });

            callback(err, markers);
        }
        else {
            callback(err, []);
        }
    });
};


//CFei added 11/14/2008
var mBlnSetDate = false;
var fei_comps;
var fei_Lat;
var fei_Lng;
var fei_plow;
var fei_salt;
var fei_latlng;
var fei_clickedMarker = null;
 
// for the map
 var map;
var vehNameArray = new Array();
var lastLocArray = new Array();
 var marker;
 var markers;
 var vehname;
 var vehSeq;
  var currentTime;
 //var endhour;
 var timeOut = 50;  // length to wait till next point is plotted
 var h = 0;
 var plow;
 var salt;
 
 // for display
 var loadingMessage;
 //var distanceMessage;
 //var speedMessage;
 var timeMessage;
 var truckMessage;
 var bRowColor = false;
 var checkPointCount = 1;
 var vehCount=0;
 
 // for distance calculations
 var distance = 0;
 var checkPoint; 
 var checkPointDistance = 0;
 
 var cammarkers = new Array();
 var snowmarkers = new Array();
 var xymarkers = new Array();
 //var camon = true;
 var snowon = true;
 //var nhson;
 // for time calculations
 
 //for timeout
 var xySeq;

 var totalTime = 0;
 var needconfirm = false;
 var curevent;

var layers = {
"NHS":
 {"url" : "http://164.82.148.52/tracker/wfs.aspx?format=kml&segments=t",
  "name" : "NHS Road Condition"}
};

//CFei added
var refTimer;

function DCGISLogoControl(controlDiv, map) {
    controlDiv.style.padding = '5px';
    var img = document.createElement('img');
    img.setAttribute("src", 'images/Powered-By-OCTO-DCGIS-75x56.jpg');
    img.setAttribute("title", 'Powered by DCGIS at OCTO');
    img.style.cursor = "pointer";
    controlDiv.appendChild(img);
    google.maps.event.addDomListener(img, "click", function() {
        openURL('http://dcgis.dc.gov');
    });
}

//var initX="", initY="", initLabel="";
function zoomToLoc(){
	if(initX == "" || initY == "" || initLabel=="" || map == null) return;
	
	needconfirm=true;
	
	var ret={};// holds returned caculated values
	var llCoords = SPCStoLL(initX, initY, ret);
	var point = new google.maps.LatLng(ret.lat, ret.lon);
	var marker = new google.maps.Marker({ position: point, icon: houseicon, title: initLabel });
	marker.setMap(map);
	map.setCenter(point);
	map.setZoom(16);
	document.getElementById('datetime').style.visibility = 'visible';
	
	get311calls();
}
//end

function get311calls() {
    var query = "getData.aspx?type=311&";
    var bounds = map.getBounds();
    if (bounds) {
        query += "ne_lat=" + bounds.getNorthEast().lat() + "&";
        query += "ne_lng=" + bounds.getNorthEast().lng() + "&";
        query += "sw_lat=" + bounds.getSouthWest().lat() + "&";
        query += "sw_lng=" + bounds.getSouthWest().lng();
        $.get(query, display);
    }
}

function display(text, code) {
    //CFei added 11/17/2011
    if (text != "") {
        clearSnow();
    }
    //end
    
    var items = text.split("|");
    
    //result = result + x + seperator + Y + seperator + sdesc + seperator + sstatus + seperator + spriority + seperator + lastdate + seperator + addr + seperator + zone + seperator + area + seperator + rttype + seperator + rtid
                
    for (i = 0; i < items.length-1; i++) {
        var comps = items[i].split(";;");
        var lat = comps[0];
        var lng = comps[1];
        var id = comps[2];
        var sdesc = comps[3];
        var sstatus = comps[4];
        var spriority = comps[5];
        var lastdate = comps[6];
        var addr = comps[7];
        var zone = comps[8];
        var area = comps[9];
        var rttype = comps[10];
        var rtid = comps[11];

        var point = new google.maps.LatLng(lat, lng);
        var marker;
        if (sdesc.toLowerCase().indexOf("tree") != -1) {
            marker = newcreateMarker(point, id, sdesc, sstatus, spriority, lastdate, addr, zone, area, rttype, rtid, treeicon);
            
        } else if (sdesc.toLowerCase().indexOf("snow") != -1) {
            marker = newcreateMarker(point, id, sdesc, sstatus, spriority, lastdate, addr, zone, area, rttype, rtid, snowicon);
        }

        snowmarkers.push(marker);
        marker.setMap(map);
    }

    if (fei_clickedMarker != null) {
        //fei_clickedMarker.marker.openInfoWindowHtml(fei_clickedMarker.contents, { maxHeight: 250, maxWidth: 350 });
        infowindow.setContent(fei_clickedMarker.contents);
        infowindow.setPosition(fei_clickedMarker.marker.getPosition());
        infowindow.setMap(map);
        
        fei_clickedMarker = null;
    }
    
}
function newcreateMarker(point, id, sdesc, sstatus, spriority, lastdate, addr, zone, area, rttype, rtid, theicon)
{
	var marker = new google.maps.Marker({position:point, title: sdesc, icon: theicon });

	
	var popuphtml = '<table><tr><td><div class="gmaplogo"></div></td><td><div class="gmaptitlePopup"><b>' + id + '</b></div></td></tr>';
	popuphtml += '<tr><td colspan="2">Description: ' + sdesc + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Status: ' + sstatus + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Priority: ' + spriority + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Address: ' + addr + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Snow Zone: ' + zone + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Snow Area: ' + area + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Route Type: ' + rttype + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Route ID: ' + rtid + '</td></tr>';
	popuphtml += '<tr><td colspan="2">Last Modified Date: ' + lastdate + '</td></tr>';


	google.maps.event.addListener(marker, 'click', function() {
	    //map.closeInfoWindow();
	    //marker.openInfoWindowHtml(popuphtml, { maxHeight: 250, maxWidth: 350 });
	    infowindow.setContent(popuphtml);
	    infowindow.setPosition(marker.getPosition());
	    infowindow.setMap(map);
	    fei_clickedMarker = { "marker": marker, "contents": popuphtml };
	});
    return marker;
          
}

// CREATE MAP & DISPLAY CONTROLS AND STARTING LOCATION //
function onLoad() {
	newpopulateTime();
	
	// kill if safari
	//var detect = navigator.userAgent.toLowerCase();
	
	//if((detect.indexOf("safari") + 1)) {
        //alert("This currently crashes Safari.  We apologize, and are working on a fix.")
    //}
	//else {
	
	loadingMessage = document.getElementById('progress');
	//distanceMessage = document.getElementById('distanceMessage');
	//speedMessage = document.getElementById("speedMessage");
	timeMessage = document.getElementById('timeMessage');
	truckMessage = document.getElementById('truckMessage');

	var latlng = new google.maps.LatLng(38.897000, -77.02000);
	var myOptions = {
	    zoom: 11,
	    minZoom: 10,
	    center: latlng,
	    scaleControl: true,
	    mapTypeControl: true,
	    mapTypeId: google.maps.MapTypeId.ROADMAP,
	    streetViewControl: true
	};
	map = new google.maps.Map(document.getElementById("map"), myOptions);
	
	var dclogoDiv = document.createElement('DIV');
	var homeControl = new DCGISLogoControl(dclogoDiv, map);
	homeControl.index = 1;
	map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(dclogoDiv);

	infowindow = new google.maps.InfoWindow();
	infowindow.id = "feiinfowindow";
	google.maps.event.addListener(infowindow, "closeclick", function() {
	    clearInterval(refTimer);
	});
	
	addDistrictBound();
	addTrafficCamera();

	google.maps.event.addListener(map, "dragstart", function() {
	    infowindow.setMap(null);
	});

	google.maps.event.addListener(map, "dragend", function() {
	    if ((map.getZoom() >= 13) && snowon) {
	        get311calls();
        }
	});

	google.maps.event.addListener(map, "zoom_changed", function() {
		if ((map.getZoom() >= 13) && snowon) {
		    get311calls();
		}
	});
	
	//CFei added
	zoomToLoc();
	
	setTimeout('autozoom()', 500)
}

//CFei added
function autozoom()
{
	if(mBlnSetDate) {
	    if (needconfirm) {
		    var answer = confirm ("Start animation?");
		    if (answer) {
			    newshowAnimation();
		    }
	    }
	}
}

function newshowAnimation() {
	lblTime.innerHTML = "<strong>Time: </strong>";
		h = 0;	

		if (map.getZoom()>=15){

			var cpStartdate = document.getElementById("cpStartDate");
			var cpEnddate = document.getElementById("cpEndDate");
			var selectStartDate = "";
			var selectEndDate = "";
			for(var j=0; j< cpStartdate.options.length; j++)
			{
				if(cpStartdate.options[j].selected)
				{
					selectStartDate = cpStartdate.options[cpStartdate.selectedIndex].value;
				}
			}
			for(var n=0; n< cpEnddate.options.length; n++)
			{
				if(cpEnddate.options[n].selected)
				{
					selectEndDate = cpEnddate.options[cpEnddate.selectedIndex].value;
				}
			}
			if ((cpStartdate != "") && (selectEndDate != "")) {
				var query="getData.aspx?starttime="+selectStartDate+"&endtime="+selectEndDate+"&";

				var bounds=map.getBounds();
				query+="ne_lat="+bounds.getNorthEast().lat()+"&";
				query+="ne_lng="+bounds.getNorthEast().lng()+"&";
				query+="sw_lat="+bounds.getSouthWest().lat()+"&";
				query+="sw_lng="+bounds.getSouthWest().lng();
				//alert(query);
				$.get(query,  loadInfo);
			} else {
				alert("Please select a start and end Date before proceeding.");
			}
		} else {
			alert("You need zoom in the map further to use this tool.");
		}
}

function removeXYs() {
    // special case: remove all markers (removeOverlays will remove paths as well)
    for (var v = 0; v < xymarkers.length; v++) {
        xymarkers[v].setMap(null);
        //xymarkers[v].remove();
    }
    xymarkers = [];
    loadingMessage.style.width = "0%";
    timeMessage.innerHTML = "";
}

function Left(str, n){
	if (n <= 0)
	    return "";
	else if (n > String(str).length)
	    return str;
	else
	    return String(str).substring(0,n);
}
function Right(str, n){
    if (n <= 0)
       return "";
    else if (n > String(str).length)
       return str;
    else {
       var iLen = String(str).length;
       return String(str).substring(iLen, iLen - n);
    }
}

function newpopulateTime()
{
		$.get("getData.aspx?getTime=1", function(data) {
		if (data!="Error") {
			var starttime="";
			var endtime="";
			if (data.indexOf("|") == -1) {
                starttime = "";
                endtime="";
            } else {
            
                if (data == "|") {
                    starttime = "";
					endtime="";
                } else if (data.charAt(0) == "|") {
                    endtime = Right(data, data.length - 1);
                } else if (data.charAt(data.length-1) == "|") {
                    starttime = Left(data, data.length - 1);
                } else {
                    var splitTime = data.split("|");
                    starttime = splitTime[0]; 
                    endtime = splitTime[1];
                }
            }
            //start populating the dropdown
            if (starttime!="") {
				//start time has to be something
				var largeDate;
				var largeDate1;
				var negative=false;
				if (endtime!="") {
					largeDate = new Date(starttime);
					largeDate1 =new Date(endtime);
					if (largeDate1.getTime()-largeDate.getTime()<=0) {
						var tempdate=largeDate1;
						largeDate1=largeDate;
						largeDate=tempdate;
						negative=true;
					}
					//alert(largeDate.getMonth()+1 + "/" + largeDate.getDate() + "/" + largeDate.getFullYear());
					var frommonth= largeDate.getMonth()+1;
					var tomonth= largeDate1.getMonth()+1;
					var newinnerhtml;
					newinnerhtml="from " + frommonth + "/" + largeDate.getDate() + "/" + largeDate.getFullYear() + " to " + tomonth + "/" + largeDate1.getDate() + "/" + largeDate1.getFullYear();
					if (initLabel!="") newinnerhtml+= " (around " + initLabel + ")";
					document.getElementById('lbltime').innerHTML=newinnerhtml;
				} else {
					
					largeDate = new Date(starttime);
					largeDate1 = new Date();
					var frommonth= largeDate.getMonth()+1;
					var newinnerhtml;
					newinnerhtml="from " + frommonth + "/" + largeDate.getDate() + "/" + largeDate.getFullYear() + " and Ongoing..";
					if (initLabel!="") newinnerhtml+= " (around " + initLabel + ")";
					document.getElementById('lbltime').innerHTML=newinnerhtml;
					//alert(largeDate1.getTime()-largeDate.getTime());
					if (largeDate1.getTime()-largeDate.getTime()<=0) {
						var tempdate=largeDate1;
						largeDate1=largeDate;
						largeDate=tempdate;
						negative=true;
					}
				}
				
				
				
				
				//alert(htmlCode.value);
				//we got both start and end time ready, time to create this dropdown list...
				//Set 1 day in milliseconds
				var one_day=1000*60*60*24;
		
				var yesterday=largeDate1;
				var ctrlStart = document.getElementById("cpStartDate");
				var ctrlEnd = document.getElementById("cpEndDate");
				
				var htmlCodeStart;
				var htmlvalStart;
				var htmlCodeEnd;
				var htmlvalEnd;
				
				var r;

				if (largeDate1.getMonth()+1 + "/" + largeDate1.getDate() + "/" + largeDate1.getFullYear()==largeDate.getMonth()+1 + "/" + largeDate.getDate() + "/" + largeDate.getFullYear()) {
					r=1;
				} else {
					if (endtime!="") {
						r= Math.ceil((largeDate1.getTime()-largeDate.getTime())/(one_day))+1;

					} else {
						r= Math.ceil((largeDate1.getTime()-largeDate.getTime())/(one_day));
					}
				}
				
				var loop = 0;
			    
			    //CFei added 11/14/2008
			    var currentDate = new Date();
			    var today = currentDate.getMonth()+1 + "/" + currentDate.getDate()+"/"+currentDate.getFullYear();
			    //var today = "2/17/2008";
				mBlnSetDate = false;
			    //end
			    
			    while (loop < r) {
					htmlCodeStart = document.createElement('option');
					ctrlStart.options.add(htmlCodeStart);
					htmlvalStart=yesterday.getMonth()+1 + "/" + yesterday.getDate() + "/" + yesterday.getFullYear();
					htmlCodeStart.text = htmlvalStart;
					htmlCodeStart.value = htmlvalStart;
					if (loop == r-1) {
						htmlCodeStart.selected=true;
						//timechange();
						mBlnSetDate = true;
					}
					htmlCodeEnd = document.createElement('option');
					ctrlEnd.options.add(htmlCodeEnd);
					htmlvalEnd=yesterday.getMonth()+1 + "/" + yesterday.getDate() + "/" + yesterday.getFullYear();
					htmlCodeEnd.text = htmlvalEnd;
					htmlCodeEnd.value = htmlvalEnd;
					if (r==1 || htmlCodeEnd == today) {
						htmlCodeEnd.selected=true;
						//timechange();
						mBlnSetDate = mBlnSetDate && true;
					}
					yesterday = new Date(yesterday.getTime() - one_day );
					loop++;
				}
			}
		}
    }); 
 
}

//-----------------------------------------------------------------------------------------
// add DC Boundary layer.
//-----------------------------------------------------------------------------------------
function addDistrictBound() {
    dcbndyply = new google.maps.KmlLayer(dcBoundaryKML, { clickable: false, preserveViewport: true, map: map });
}

function addTrafficCamera()
{
    $.get("getData.aspx?type=camera", function(data) {
        //alert(data);
        if (data.indexOf("Sorry") != -1) return;
        
        var lat, lng, img, id, name, ref;
        var cams = data.split(";");
        for (var i = 0; i < cams.length; i++) {
            var cam = cams[i].split(",");
            lat = lng = img = id = name = ref = "";
            for (var j = 0; j < cam.length; j++) {
                var cm = cam[j].split("^");
                if (cm[0] === "lat") lat = cm[1];
                else if (cm[0] === "lng") lng = cm[1];
                else if (cm[0] === "img") img = cm[1];
                else if (cm[0] === "id") id = cm[1];
                else if (cm[0] === "nm") name = cm[1];
                else if (cm[0] === "ref") ref = cm[1];
            }
            if (lat.length > 0 && lng.length > 0) {
                var point = new google.maps.LatLng(lat, lng);
                var cammarker = createSimpleMarker(point, camIcon, name, id, img, ref);
                cammarker.setMap(map);
                cammarkers.push(cammarker);
            }
            else {
                continue;
            }
        }
    }); 
}

function createSimpleMarker(point, camIcon, location, id, weburl, rate)
{
    var cammarker = new google.maps.Marker({ position: point, icon: camIcon });

    //var html="<table><tr><td align='center'><b>Location:</b> " + location + "</b></td></tr><tr><td align='center'><a href='" + weburl + "' target='_new'><img id='currentcam' src='"+weburl+"'"
    var html = "<table style='font-size:0.8em'><tr><td align='center'><b>Location:</b> " + location + "</b></td></tr><tr><td align='center'><img id='currentCam"+id+"' src='" + weburl + "'";

    google.maps.event.addListener(cammarker, 'click', function() {
        var rannum = Math.random();
        infowindow.setContent(html + " width='200' height='150'></td></tr><tr><td align='center'>" + new Date() + "</td></tr></table>");
        infowindow.setPosition(cammarker.getPosition());
        infowindow.setMap(map);
        refreshCamera(id, weburl, rate);
    });
	
	return cammarker;
}

function refreshCamera(id, src, refRate) {
    refTimer = window.setInterval(function() {
        var d = new Date();
        $("#currentCam"+id).attr('src', src + '&t='+d.getTime());
    }, refRate);
}

function toggleCamera() {
    var blnShow = $("#CAM").is(':checked');
      for (var p = 0; p < cammarkers.length; p++) {
        var marker = cammarkers[p];
        if (blnShow) {
          marker.setMap(map);
        } else {
          marker.setMap(null);
        }
      }
  }

function toggleSnow() {
	if (snowon) {
		snowon=false;
		clearSnow();
		
	} else {
		snowon=true;
		get311calls();
		
	}
      
}
function clearCamera() {

      for (var p = 0; p < cammarkers.length; p++) {
        var marker = cammarkers[p];
        marker.setMap(null);
    }
    //CFei added 11/17/2011
    cammarkers = [];
    //end
}

function clearSnow() {

    for (var p = 0; p < snowmarkers.length; p++) {
        var marker = snowmarkers[p];
        marker.setMap(null);
    }
    //CFei added 11/17/2011
    snowmarkers = [];
    //end
}

function initCheckpoint(){
checkPoint = 0;
}


function loadInfo(text, code){	
	//alert(text);
	if ((text!="Error") && (text!="")) {
	    var textgroup;
	    
	    textgroup = text.split("XXXXX");
	    if (textgroup.length>1) {
	    	curevent = textgroup[0];
	   	//alert(curevent);
	    	text = textgroup[1];
		vehiclegroups=null;
		if  (text.indexOf("||") != -1) {
			//have vehicle count
			vehiclegroups=text.split("||");
			//alert(vehiclegroups.length);
			markers = vehiclegroups[0].split("%%");
			if  (vehiclegroups[1].indexOf(",,") != -1) {
				vehNameArray = vehiclegroups[1].split(",,");
				
			} else {
				vehNameArray[0] = vehiclegroups[1];
			}
			for(var q=0; q<vehNameArray.length; q++) {
				lastLocArray[q]= "";
			}
			//alert(vehNameArray.length);
			if ((vehNameArray.length>0) && (markers.length>0)) {
				//plotPoint();
			}
		} else {
            markers = [];
			// alert("No vehicle in the search area during the time frame you specified!");
		}
	    } else {
            markers = [];
	    	// alert("No vehicle in the search area during the time frame you specified!!");
	    }
	} else {
        markers = [];
		// alert("No vehicle in the search area during the time frame you specified!!!");
	}
}


Array.prototype.indexOf = function( v, b, s ) {
 for( var j = +b || 0, l = this.length; j < l; j++ ) {
  if( this[j]===v || s && this[j]==v ) {return j; }
 }
 return -1;
}

String.prototype.trim = function () 
{
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
}

function plotPoint(){
	
	currentTime = 0;
	 //alert("plot:" +curevent);
	
	if (h < markers.length ) {
		fei_comps=markers[h].split(";;");
		vehname=fei_comps[0];
		vehSeq = vehNameArray.indexOf(vehname);
		//alert(vehSeq);
		fei_Lat=fei_comps[1];
		fei_Lng=fei_comps[2];
		currentTime=fei_comps[3];
		fei_plow=fei_comps[4];
		fei_salt=fei_comps[5];
		fei_latlng = new google.maps.LatLng(fei_Lat, fei_Lng);

		loadingPercentage(h,markers.length);
		//truckMessage.innerHTML= "<strong>Truck</strong>: " + vehname+" · ";
		timeMessage.innerHTML="<strong>" + currentTime + "</strong>";

		marker = createMarker(fei_latlng, markers.length, vehname, currentTime, vehSeq, fei_plow, fei_salt);
		if (h == markers.length - 1) {
			alert("Animation finished.");
			var uhtml;
			
			uhtml="<input id='cpSubmit1' onclick='removeXYs();newshowAnimation();' type='button' value='Rerun' name='cpSubmit1'>&nbsp;";
				uhtml+="<input id='clearTimeout1' onclick='javascript: window.location=\"AVLAddress.aspx\"' type='button' value='New location' name='clearTimeout1'>";
				lblTime.innerHTML = "";
				timeMessage.innerHTML=uhtml;
		}else {
		        h++;
			if (h < markers.length ){window.setTimeout(plotPoint,timeOut);}
		}
		
		
	}
}

//stop animation
function canceltimeout() {
    if (markers)
        h = markers.length - 1;
    else
        h = 0;
}


// GET THE APPROPRIATE MARKER FOR START, FINISH, CHECKPOINT, AND LINE
function createMarker(point, markerLength, vehname,currentTime,vehSeq, plow, salt) {
 //alert("get into:" + curevent);
	
	var letter;
	letter = String.fromCharCode("A".charCodeAt(0) + vehSeq);

	var icn;
	if (curevent=="salt") {
		
		if (salt=="1") {
		    //dc truck
			icn = blueicon;
		} else {
		    //contractor truck
			icn = orangeicon;
		}
	} else {
	
		if ((plow=="1") && (salt=="1")) {
		    //plow and salt
			icn = purpleicon;
		} else if (plow=="1") {
		//plow only
			icn = greenicon;
		} else if (salt=="1") {
			//salt only
			icn = blueicon;
		} else if (((plow=="-1") && (salt=="-1")) || (plow=="2") || (salt=="2")) {
			//contractor plow
		//contractor plow
			icn = orangeicon;
		} else if ((plow=="0") && (salt=="0")) {
		//inactive dc plow
			icn = brownicon;
		} else {
		//something else?
			icn = redicon;
		}
	}

	if (vehname.indexOf("HP-")!=-1) {
	    vehname = "Heavy Plow"
	} else if (vehname.indexOf("LP-") != -1) {
	    vehname = "Light Plow"
	} else if (vehname.indexOf("CT-") != -1) {
	    vehname = "Chemical Treatment/Spray"
	} else {
	    vehname = "Unclassified Plow"
	}
	var marker = new google.maps.Marker({ position: point, icon: icn, title: vehname + " at " + currentTime });

	xymarkers.push(marker);
	marker.setMap(map);		
		
	return marker;
}


// LOADING BAR //
function loadingPercentage(currentPoint, markerslen){
	if (markerslen>1) {
		var percentage = Math.round((currentPoint/(markerslen - 1)) * 100);
		loadingMessage.style.width = percentage +"%"; 
	} else {
		loadingMessage.style.width = "100%"; 
	}
}

function zoomtopoint(Lat, Lng) {
	map.setCenter(new google.maps.LatLng(Lat, Lng));
	map.setZoom(15);
	document.getElementById("stats").style.display = "none";
	document.getElementById("showStats").style.display = "block";
	document.getElementById("hideStats").style.display = "none";
}

// Function based on Vincenty formula 
// Website referenced: http://www.movable-type.co.uk/scripts/LatLongVincenty.html
// Thanks Chris Veness for this!
//Also a big thank you to Steve Conniff for taking the time to intruoduce to this more accurate method of calculating distance

function calculateDistance(point1y, point1x, point2y, point2x) {  // Vincenty formula

  traveled = LatLong.distVincenty(new LatLong(point2x, point2y), new LatLong(point1x, point1y));
  traveled = traveled * 0.000621371192;  // Convert to miles from meters
  distance = distance + traveled;
  checkPointDistance = checkPointDistance + traveled;
}

/*
 * LatLong constructor:
 *
 *   arguments are in degrees, either numeric or formatted as per LatLong.degToRad
 *   returned lat -pi/2 ... +pi/2, E = +ve
 *   returned lon -pi ... +pi, N = +ve
 */
function LatLong(degLat, degLong) {
  if (typeof degLat == 'number' && typeof degLong == 'number') {  // numerics
    this.lat = degLat * Math.PI / 180;
    this.lon = degLong * Math.PI / 180;
  } else if (!isNaN(Number(degLat)) && !isNaN(Number(degLong))) { // numerics-as-strings
    this.lat = degLat * Math.PI / 180;
    this.lon = degLong * Math.PI / 180;
  } else {                                                        // deg-min-sec with dir'n
    this.lat = LatLong.degToRad(degLat);
    this.lon = LatLong.degToRad(degLong);
  }
}

/*
 * Calculate geodesic distance (in m) between two points specified by latitude/longitude.
 *
 * from: Vincenty inverse formula - T Vincenty, "Direct and Inverse Solutions of Geodesics on the 
 *       Ellipsoid with application of nested equations", Survey Review, vol XXII no 176, 1975
 *       http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf
 */
LatLong.distVincenty = function(p1, p2) {
  var a = 6378137, b = 6356752.3142,  f = 1/298.257223563;
  var L = p2.lon - p1.lon;
  var U1 = Math.atan((1-f) * Math.tan(p1.lat));
  var U2 = Math.atan((1-f) * Math.tan(p2.lat));
  var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  var lambda = L, lambdaP = 2*Math.PI;
  var iterLimit = 20;
  while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit>0) {
    var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    var sinSigma = Math.sqrt((cosU2*sinLambda) * (cosU2*sinLambda) + 
      (cosU1*sinU2-sinU1*cosU2*cosLambda) * (cosU1*sinU2-sinU1*cosU2*cosLambda));
    if (sinSigma==0) return 0;  // co-incident points
    var cosSigma = sinU1*sinU2 + cosU1*cosU2*cosLambda;
    var sigma = Math.atan2(sinSigma, cosSigma);
    var alpha = Math.asin(cosU1 * cosU2 * sinLambda / sinSigma);
    var cosSqAlpha = Math.cos(alpha) * Math.cos(alpha);
    var cos2SigmaM = cosSigma - 2*sinU1*sinU2/cosSqAlpha;
    var C = f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1-C) * f * Math.sin(alpha) *
      (sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
  }
  if (iterLimit==0) return NaN  // formula failed to converge
  var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
  var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
  var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
  deltaSigma = B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-
    B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
  s = b*A*(sigma-deltaSigma);
  s = s.toFixed(3); // round to 1mm precision
  return s;
}


// PARSE TIME FROM XML AND THEN FIND THE DIFFERENCE BETWEEN LAST MEASUREMENT WITH RUNNING TOTAL //
function calculateTime(i, lastTime, currentTime)
{

	if (i > 0 ){

		//begin year/month/day
		var largeDate = currentTime.split(" ");
		var date = largeDate[0];
		date = date.split("/");
		var beforeYear = date[0];
		var beforeDay = date[2];
		//beforeDay = beforeDay.replace("0","");
		var beforeMonth = date[1];
		//beforeMonth = beforeMonth.replace("0","");
	
		//end year/month/day
		var largeDate1 = lastTime.split(" ");
		var date1 = largeDate1[0];
		date1 = date1.split("/");
		var afterYear = date1[0];
		var afterDay = date1[2];
		//afterDay = afterDay.replace("0","");
		var afterMonth = date1[1];
		//afterMonth = afterMonth.replace("0","");
	
		//begin hour/min/seconds
		var after = largeDate[1].replace(" ","");
		var afternoon;
		if (largeDate[1].indexOf("AM")!=-1) {after = largeDate[1].replace("AM","");afternoon=0;}	
		if (largeDate[1].indexOf("PM")!=-1) {after = largeDate[1].replace("PM","");afternoon=1;}	
	
		afterArray = after.split(":");
		var hour = afterArray[0];
		if (afternoon==1) {hour=hour+12;}
		var minute = afterArray[1];
		var second = afterArray[2];
	
		//end hour/min/seconds
		var after1 = largeDate1[1].replace(" ","");
		if (largeDate1[1].indexOf("AM")!=-1) {after1 = largeDate1[1].replace("AM","");afternoon=0;}	
		if (largeDate1[1].indexOf("PM")!=-1) {after1 = largeDate1[1].replace("PM","");afternoon=1;}

	
		afterArray1 = after1.split(":");
		var hour1 = afterArray1[0];
		if (afternoon==1) {hour1=hour1+12;}
		var minute1 = afterArray1[1];
		var second1 = afterArray1[2];
	
		var before =new Date(beforeYear, beforeMonth, beforeDay, hour, minute, second);
		var after =new Date(afterYear, afterMonth, afterDay, hour1, minute1, second1);
		var seconds = 1000;
		var secondsBetween = Math.ceil((before.getTime()-after.getTime())/(seconds));
		totalTime = totalTime + secondsBetween;
		convertSeconds(totalTime); 
	}
}



function convertSeconds(seconds) {
	 //find hours
	 if(seconds > 3600) {
		hours = Math.round(((seconds / 3600)*10)/10) - Math.round((((seconds % 3600)*10)/3600)/10);
		seconds = seconds - (hours * 3600);
		hours += " hrs ";
	 }
	 else {
		hours = "";
	 }
	 //find minutes
	 if(seconds > 60) {
		minutes = Math.round(((seconds / 60)*10)/10) - Math.round((((seconds % 60)*10)/60)/10);
		seconds = seconds - (minutes * 60);
		minutes += " mins ";
	 }
	 else {
		minutes = "";
	 }
	
	return hours + minutes + seconds + " secs ";
}
