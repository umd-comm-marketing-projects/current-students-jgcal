/*
 * jGCal - A Google Calendar Feed Parser and Formatter 
 * @author Kyle Smith <knksmith57@gmail.com>
 * @version 0.12
 */

!function($, undefined) {

   $.fn.jgcal = function(options,fnsOverrides,callback) {
      
      var settings = $.extend(true, {
         limit       : 5,
         sortAsc     : true,
         tweenTime   : 1000,
         startDate   : new Date(),
         refresh     : {
               auto     : false,
               interval : 10, 
               timeUnit : "minutes"
         },
         params      : {
               "alt"    : "jsonc",
               "v"      : 2,
               "ctz"    : "America/Detroit", // timezone string, see http://en.wikipedia.org/wiki/List_of_tz_database_time_zones
         },
      }, options), 
      _root, _loader, events = [], feeds = {}, errors = [], numFeeds = 0, numLoaded = 0, 
      months = ["January","February","March","April","May","June","July","August","September","October","November","December"],
      days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],

      fns = {
         getFeeds : function() {
            for(var url in feeds) {
               var self = this, jqxhr;

               jqxhr = $.ajax({
                  url: url,
                  data: feeds[url].params,
                  dataType: "json"
               }); 

               jqxhr.success(function(data) {
                  // console.log(data) // Want to see exactly what's being returned?
                  var feedURL = this.url.split("?" + this.data)[0]; // need this to determine which feed event is from

                  if(data.data.items && data.data.items.length > 0) {
                     for(var j=0; j < data.data.items.length; j++) {
                        // Add the event to the list
                        events.push( self.formatEvent
                        (
                           data.data.items[j].title,
                           data.data.items[j].when,
                           data.data.items[j].location,
                           data.data.items[j].details,
                           data.data.items[j].id,
                           feedURL
                        ));
                     }
                  }   
               }); // END jqxhr.success

               jqxhr.complete(function(jqXHR, status) {
                  numLoaded++;

                  if(status !== 'success') {
                     // Ajax request failed
                     errors.push("Could not retrieve events for " + this.url);
                  }

                  if(numLoaded == numFeeds) {
                     // Sort the events array based on user settings
                     events.sort(self.sortEvents);

                     self.showFeeds();  
                     // Once complete, call callback function and give it the
                     // events array
                     if($.isFunction(callback)){
                        callback.call(_root, events);
                     }
                  }
               }); // END jqxhr.complete
            } // END for: settings.feeds.length 
         }, // END getFeeds
         formatFeeds : function(feeds) {
            switch(helperFns.typeOfIt(feeds)) {
               case "undefined":
                  return [];
                  break;
               case "string":
                  numFeeds++;
                  return [{url : feeds}];
                  break;
               case "array":
                  var tempFeeds = [];
                  for(i in feeds) {
                     var tempFeed = this.formatFeeds(feeds[i]);
                     if(tempFeed.length > 0) {
                        for(var i=0; i < tempFeed.length; i++) {
                           tempFeeds.push(tempFeed[i]); 
                        } 
                     }
                  }
                  return tempFeeds;
                  break;
               case "object":                  
                  numFeeds++;
                  return feeds.url ? [feeds] : [];
                  break;
               default:
                  return [];
            }
         },
         showErrors : function() {
            // Show the error messages in the calendar container
            _root.append( formFns.errTemp(errors) );
            _root.slideDown(settings.tweenTime);
         },
         showFeeds : function() {
            var self = this;
            
            // Clear out the list (in case this is a refresh)
            _root.empty();
            
            if(events.length > 0) {
               // Build html for events and inject into DOM
               for(var i=0; i < events.length && i < settings.limit; i++) {
                  _root.append( formFns.feedTemp(events[i], helperFns) );
               }
               
               // Finally, slide down the div
               _root.slideDown(settings.tweenTime);
            } else {
               errors.push('No events were found')
               self.showErrors(); 
            }
         },
         formatEvent : function(title, date, location, details, eventID, feedURL) {
            // This method formats a newly retrieved event for use with the calendar
            var   eventObj = {
                     "ID"        : eventID,
                     "title"     : title,
                     "date"      : { start: new Date(date[0].start), end: new Date(date[0].end) }, 
                     "location"  : location,
                     "details"   : details,
                     "group"     : feeds[feedURL].group 
                  },
                  s        = eventObj.date.start,
                  f        = eventObj.date.end,
                  ade      = helperFns.isAllDayEvent(s,f),
                  propsAr  = ["title","date","month","day","dateString","time","location","details","group"],
                  props    = {
                     eventID  : eventObj.ID,
                     dateObj  : eventObj.date,
                     ade      : ade,
                     mde      : (s.getDate() == f.getDate() ? false : !ade)
                  };

            for(var a=0; a < propsAr.length; a++) {
               props[propsAr[a]] = formFns[propsAr[a]](eventObj,s,f,ade,helperFns);
            }
            
            return props;
         },
         sortEvents : function(ev1, ev2) {
            // Sort the two events based on start date
            if(settings.sortAsc) {
               return (ev1.date.start < ev2.date.start) ? -1 : (ev1.date.start > ev2.date.start) ? 1 : 0;
            } else {
               return (ev1.date.start > ev2.date.start) ? -1 : (ev1.date.start < ev2.date.start) ? 1 : 0;
            }
         }
      }, // END fns
      
      formFns = $.extend(true, {
         feedTemp : function(props) {
            var html = "<li class=\"" + props["group"] + "\">\n" +
               "<span class=\"feed-title\">" + props["title"] + "</span><br />\n" + 
               "<span class=\"feed-date\">" + props["dateString"] + "</span><br />\n"; 
            if(props["time"] !== false)     html+= "<span class=\"feed-time\">" + props["time"] + "</span>\n";
            if(props["location"] !== false) html+= "<span class=\"feed-location\">" + props["location"] + "</span>\n";
            if(props["details"] !== false)  html+= "<div class=\"feed-details\"><pre>" + props["details"] + "</pre></span>\n";
            html+= "</li>\n";
            return html;
         }, // END feedTemp
         loadTemp : function() {
            return "<li class=\"loading\">Loading...</li>\n";
         },
         errTemp : function(msgArr) {
            return "<li>Calendar could not be loaded. Please try again\n<div style=\"display:none\">" + msgArr.join(', ') + "</div>\n</li>\n";
         },
         title : function(ev,s,f,ade) {
            return ev.title;
         }, 
         date : function(ev,s,f,ade) {
            return (ade ? f.getDate() : s.getDate()); 
         },
         month : function(ev,s,f,ade) {
            return helperFns.getMonth(s.getMonth()); 
         },
         day : function(ev,s,f,ade) {
            return (ade ? helperFns.getDay(f.getDay()) : helperFns.getDay(s.getDay()));
         },
         dateString : function(ev,s,f,ade) {
            var res = "";
               
            if(s.getMonth() == f.getMonth() || ade) {    // In the same month or all day event on last day of month
               res+= helperFns.getMonth(f.getMonth());
               if(!ade) { 
                  res+= " " + s.getDate();
               } else {
                  res+= " " + f.getDate();
               }

               // if the event spreads across different days,
               // and that spread isn't because of an "all
               // day event" (24 hours exactly, same
               // start/end time), then print the span
               if((s.getDate() !== f.getDate()) && !ade) {
                  res+= "-" + f.getDate();
               }
            } else { // different months
               res+= helperFns.getMonth(s.getMonth()) + " " + s.getDate();
               res+= " - ";
               res+= helperFns.getMonth(f.getMonth()) + " " + f.getDate();
            }
            
            return res;
         }, // END dateString
         time : function(ev,s,f,ade) {
            // If an "all day event", time won't be shown
            if(ade) {
               return false;
            }

            var   res = "",
                  suffix = { pm: "PM", am: "AM" },
                  start = { hrs: s.getHours(), mins: s.getMinutes(), suf: suffix.am },
                  end = { hrs: f.getHours(), mins: f.getMinutes(), suf: suffix.am };
            
            // format the hours / minutes / suffix from the
            // two timestamps
            (function(arr) {
               for(t in arr) {
                  if(arr[t].mins < 10) arr[t].mins = "0" + arr[t].mins;
                  if(arr[t].hrs > 12) {
                     arr[t].hrs -= 12;
                     arr[t].suf = suffix.pm;
                  } else if(arr[t].hrs == 12) {
                     arr[t].suf = suffix.pm;
                  } else if(arr[t].hrs == 0) {
                     arr[t].hrs = 12;
                  }
               }
             })([start, end]);

            // Format the final string
            res+= start.hrs;
            if(start.mins != "00") res+= ":" + start.mins;
            if((s.getDate() == f.getDate())) { // Only show end time if same date
               if(start.suf != end.suf) res+= start.suf;
               res+= " - " + end.hrs;
               if(end.mins != "00") res+= ":" + end.mins;
               res+= end.suf;
            } else {
               if(start.suf == end.suf) res+= start.suf;
            }
            return res;
         }, // END time
         location : function(ev,s,f,ade) {
            // check for an empty string, and / or format location
            if(helperFns.isEmpty(ev.location)) return false;
            else return ev.location;
         }, 
         details : function(ev,s,f,ade) {
            // check for an empty string, and / or format details
            if(helperFns.isEmpty(ev.details)) return false;
            return ev.details;
         }, 
         group : function(ev,s,f,ade) {
            return ev.group;       
         }
      }, fnsOverrides); // END formFns

      /** Helper Functions **/ 
      var helperFns = {

         // Enhanced typeof detection to support arrays
         typeOfIt : function(obj) {
            return typeof(obj) == 'object' ? obj.length ? 'array' : 'object' : typeof(obj);
         },

         // Dirty empty string test
         isEmpty : function(str) {
            return /^\s*$/.test(str);
         },

         // Month / Day getters with trim option
         // Ex)   getDay(0) === Sunday
         //       getDay(0,true) === Sun
         getDay : function(index,trim) {
            var str = days[index];
            return (trim ? str.slice(0,3) : str);
         },
         getMonth : function(index,trim) {
            var str = months[index];
            return (trim ? str.slice(0,3) : str);
         },

         // Script to check if 2 date stamps are exactly 24 hours apart, start/end
         // at the same time = 00:00. This is Google's way of designating an "all
         // day event"
         isAllDayEvent : function(date1, date2) {
            return ( (date2-date1 == 86400000) && 
                     (date1.getHours() == date2.getHours()) &&
                     (date1.getHours() == 0 ||
                        (date1.getHours() + (Math.floor(date1.getTimezoneOffset() / 60)) == 24))); // Fix for some browsers
         },

         /**
          * A big thanks to Sebastian for his javascript rfc3339 timestamp generator
          * http://cbas.pandion.im/2009/10/generating-rfc-3339-timestamps-in.html
          *
          * Internet Timestamp Generator
          * Copyright (c) 2009 Sebastiaan Deckers
          * License: GNU General Public License version 3 or later
          */
         rfc3339 : function(date) {
            var pad = function (amount, width) {
               var padding = "";
               while (padding.length < width - 1 && amount < Math.pow(10, width - padding.length - 1))
                  padding += "0";
               return padding + amount.toString();
            }
            date = date ? date : new Date();
            var offset = date.getTimezoneOffset();
            return pad(date.getFullYear(), 4)
               + "-" + pad(date.getMonth() + 1, 2)
               + "-" + pad(date.getDate(), 2)
               + "T" + pad(date.getHours(), 2)
               + ":" + pad(date.getMinutes(), 2)
               + ":" + pad(date.getSeconds(), 2)
               //+ "." + pad(date.getMilliseconds(), 3)
               + (offset > 0 ? "-" : "+")
               + pad(Math.floor(Math.abs(offset) / 60), 2)
               + ":" + pad(Math.abs(offset) % 60, 2);
         }
      }; // END helperFns

      /** Setup **/

      // Check for start / end dates and add to query params
      if(settings.startDate) {
         settings.params["start-min"] = helperFns.rfc3339(settings.startDate);
      }
      if(settings.endDate) {
         settings.params["start-max"] = helperFns.rfc3339(settings.endDate);
      }

      // Check if auto refresh is on, if it is we need to adjust some things
      if(settings.refresh.auto) {
         // We need to validate the timeUnit and convert the refresh
         // interval if necessary
         (function() {
            if(typeof(settings.refresh.timeUnit) == "string") {
               var sec = /(seconds?|secs?)/gi,
                   hr  = /(hours?|hrs?)/gi;
               if(sec.test(settings.refresh.timeUnit)) {
                  settings.refresh.timeUnit = "seconds";
                  settings.refresh.interval *= 1000;
                  return;
               } else if(hr.test(settings.refresh.timeUnit)) {
                  settings.refresh.timeUnit = "hours";
                  settings.refresh.interval *= 3600000;
                  return;
               }
            } 
            // Time unit wasn't changed, was set to minutes, or was invalid 
            settings.refresh.timeUnit = "minutes"; // Set the unit to minutes
            settings.refresh.interval *= 60000; // Multiply the current interval (milliseconds) by 60000 (1000*60), to get minutes
         })();
      }

      return this.each(function() {
         
         // Store a reference to the parent node
         _root = $(this).hide();

         // Format the user-set feeds (and check if they even set one)
         settings.feeds = fns.formatFeeds(settings.feeds);
         
         if(!settings.feeds || !(settings.feeds.length > 0)) {
            errors.push("Invalid feed was set by user");
            fns.showErrors();
         } else {

            // Create the local feeds object. This will hold a clean copy of the
            // each user-set feed and any associated params 
            for(var i=0; i < settings.feeds.length; i++) {
               var url = settings.feeds[i].url;
               feeds[url] = {};

               if(settings.feeds[i].group) {
                  feeds[url].group = settings.feeds[i].group;
               }

               if(settings.feeds[i].inherit !== false) {
                  feeds[url].params = $.extend({}, settings.params);
               } else {
                  feeds[url].params = {};
               }

               if(settings.feeds[i].params) {
                  feeds[url].params = $.extend(true, feeds[url].params, settings.feeds[i].params);
               }             

               if(settings.feeds[i].startDate) {
                  feeds[url].params["start-min"] = helperFns.rfc3339(settings.feeds[i].startDate);
               }
               if(settings.feeds[i].endDate) {
                  feeds[url].params["start-max"] = helperFns.rfc3339(settings.feeds[i].endDate);
               }
            } // END for

            // Get the feeds
            (function refresh() { 
               if(settings.refresh.auto) {
                  setTimeout(refresh, settings.refresh.interval);
               }
               
               // Reset counters and containers
               events = []; errors = []; numLoaded = 0; 

               fns.getFeeds();
            })();

         } // END else
      }); // END this.each
   }; // END $.fn.jgcal
}(jQuery);
