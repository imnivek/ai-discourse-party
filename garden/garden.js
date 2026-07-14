/* 漂浮議題園 — 分頁共用行為 */
document.documentElement.classList.remove('nojs');
(function(){
  // 漢堡選單
  var burger=document.querySelector('.nav__burger'),menu=document.querySelector('.nav__menu');
  if(burger&&menu){burger.addEventListener('click',function(){menu.classList.toggle('open');});
    menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');});});}
  // 捲動浮現（純捲動驅動，不依賴 IntersectionObserver）
  var rev=[].slice.call(document.querySelectorAll('.rv'));
  function reveal(){for(var i=0;i<rev.length;i++){var el=rev[i];if(el.classList.contains('in'))continue;
    var r=el.getBoundingClientRect();if(r.top<innerHeight*0.92&&r.bottom>-60)el.classList.add('in');}}
  var t=false;function on(){if(!t){t=true;requestAnimationFrame(function(){t=false;reveal();});}}
  addEventListener('scroll',on,{passive:true});addEventListener('resize',on);addEventListener('load',reveal);reveal();
})();
