/**
 * engage.js — 체류시간 95분+ 심리학 엔진
 * 틱톡 가변보상 + 넷플릭스 자동재생 + 슬롯머신 도파민
 * localStorage 기반, 서버 불필요
 */
(function(){
  // ══════════ [1] 레벨 시스템 (도파민+게임화) ══════════
  var KEY='bamkey_';
  function get(k,d){try{return JSON.parse(localStorage.getItem(KEY+k))||d;}catch(e){return d;}}
  function set(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v));}catch(e){}}

  var xp = get('xp',0);
  var visits = get('visits',0);
  var streak = get('streak',0);
  var lastVisit = get('lastVisit','');
  var today = new Date().toISOString().slice(0,10);

  // 출석 체크
  if(lastVisit !== today){
    visits++;
    xp += 10; // 출석 보상
    if(lastVisit === new Date(Date.now()-86400000).toISOString().slice(0,10)){
      streak++;
      if(streak>=7) xp += 50; // 7일 연속 보너스
    } else { streak = 1; }
    set('lastVisit',today);
    set('visits',visits);
    set('streak',streak);
  }

  // 페이지 방문 XP
  var pageViews = get('pageViews',0);
  pageViews++;
  xp += 5;
  set('pageViews',pageViews);
  set('xp',xp);

  // 레벨 계산
  var levels = [
    {min:0,name:'탐험가',icon:'🌱',next:50},
    {min:50,name:'클러버',icon:'🌙',next:150},
    {min:150,name:'파티피플',icon:'🎉',next:300},
    {min:300,name:'VIP',icon:'👑',next:500},
    {min:500,name:'레전드',icon:'🔥',next:9999}
  ];
  var level = levels[0];
  for(var i=levels.length-1;i>=0;i--){if(xp>=levels[i].min){level=levels[i];break;}}
  var nextLvl = levels[Math.min(levels.indexOf(level)+1,levels.length-1)];
  var progress = Math.min(100,Math.round((xp-level.min)/(nextLvl.min-level.min)*100));

  // ══════════ [2] 레벨 뱃지 표시 (상단) ══════════
  var badge = document.createElement('div');
  badge.id = 'engageBadge';
  badge.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#F8F7FF;border-bottom:1px solid #E5E7EB;font-size:12px;color:#333;">'+
    '<span>'+level.icon+' <strong>'+level.name+'</strong></span>'+
    '<div style="flex:1;height:4px;background:#E5E7EB;border-radius:2px;overflow:hidden;"><div style="height:100%;background:#8B5CF6;border-radius:2px;width:'+progress+'%;transition:width .5s;"></div></div>'+
    '<span style="color:#8B5CF6;font-weight:700;">'+xp+'XP</span>'+
    '<span style="color:#555;">🔥'+streak+'일</span>'+
    '</div>';
  var banner = document.querySelector('.bamki-banner');
  if(banner && banner.nextSibling) banner.parentNode.insertBefore(badge, banner.nextSibling);
  else if(document.body.firstChild) document.body.insertBefore(badge, document.body.firstChild);

  // ══════════ [3] 스크롤 진행률 바 (상단 고정) ══════════
  var progressBar = document.createElement('div');
  progressBar.id = 'scrollProgress';
  progressBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#8B5CF6,#06B6D4);z-index:9999;transition:width .1s;width:0;';
  document.body.appendChild(progressBar);
  window.addEventListener('scroll',function(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h>0 ? (window.scrollY/h)*100 : 0;
    progressBar.style.width = p+'%';
  });

  // ══════════ [4] 가변보상 — 스크롤 80%에서 "숨겨진 보너스" ══════════
  var bonusShown = false;
  window.addEventListener('scroll',function(){
    if(bonusShown) return;
    var p = (window.scrollY+window.innerHeight)/document.documentElement.scrollHeight;
    if(p>0.8){
      bonusShown = true;
      xp += 20;
      set('xp',xp);
      showToast('🎰 숨겨진 보너스! +20XP 획득');
    }
  });

  // ══════════ [5] 자이가르닉 효과 — 탐색 진행률 ══════════
  var explored = get('explored',[]);
  var slug = window.location.pathname.replace(/^\/v\//,'').replace(/\/$/,'');
  if(slug && slug !== '' && explored.indexOf(slug)<0){
    explored.push(slug);
    set('explored',explored);
  }
  // 진행률 표시
  var totalVenues = 103;
  var exploredCount = explored.length;
  var explorePercent = Math.round(exploredCount/totalVenues*100);

  // ══════════ [6] 토스트 알림 시스템 ══════════
  function showToast(msg){
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);opacity:0;transition:opacity .3s;max-width:90%;text-align:center;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){t.style.opacity='1';},50);
    setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},300);},3000);
  }

  // ══════════ [7] 체류시간 보상 (30초/1분/3분/5분/10분) ══════════
  var rewards = [
    {sec:30, msg:'🕐 30초 체류! +5XP', xp:5, done:false},
    {sec:60, msg:'⏰ 1분 돌파! +10XP', xp:10, done:false},
    {sec:180, msg:'🔥 3분 체류! +20XP — 당신은 진짜 탐험가', xp:20, done:false},
    {sec:300, msg:'⭐ 5분 체류! +30XP — 파티피플 자질 충분', xp:30, done:false},
    {sec:600, msg:'👑 10분! +50XP — 밤키 마스터 등극', xp:50, done:false}
  ];
  var startTime = Date.now();
  setInterval(function(){
    var elapsed = Math.floor((Date.now()-startTime)/1000);
    rewards.forEach(function(r){
      if(!r.done && elapsed>=r.sec){
        r.done = true;
        xp += r.xp;
        set('xp',xp);
        showToast(r.msg);
      }
    });
  },5000);

  // ══════════ [8] "다음에 볼 곳" 자동 추천 (넷플릭스 오토플레이) ══════════
  var autoNext = document.createElement('div');
  autoNext.id = 'autoNext';
  autoNext.style.cssText = 'display:none;position:fixed;bottom:72px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:448px;background:#fff;border:1px solid #D1D5DB;border-radius:16px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.12);z-index:800;';
  document.body.appendChild(autoNext);

  var autoNextShown = false;
  window.addEventListener('scroll',function(){
    if(autoNextShown) return;
    var p = (window.scrollY+window.innerHeight)/document.documentElement.scrollHeight;
    if(p>0.95){
      autoNextShown = true;
      // Random venue recommendation
      var h = new Date().getHours();
      var idx = (Date.now() % 103);
      autoNext.innerHTML =
        '<div style="font-size:13px;color:#555;margin-bottom:6px;">다음에 볼 곳 추천</div>'+
        '<div style="font-size:16px;font-weight:700;color:#111;margin-bottom:8px;">'+exploredCount+'/'+totalVenues+'곳 탐색 완료 ('+explorePercent+'%)</div>'+
        '<a href="/" target="_blank" rel="noopener noreferrer" style="display:block;padding:10px;background:#8B5CF6;color:#fff;text-align:center;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">더 많은 업소 탐색하기 &rarr;</a>';
      autoNext.style.display = 'block';
    }
  });

  // ══════════ [9] 클릭 보상 (도파민) ══════════
  document.addEventListener('click',function(e){
    var card = e.target.closest('.card, .rank-card, .premium-card, .dd-item');
    if(card){
      xp += 3;
      set('xp',xp);
    }
  });

  // ══════════ [10] 오늘의 운세 (가변보상 — 매일 다른 결과) ══════════
  var fortuneEl = document.getElementById('dailyFortune');
  if(!fortuneEl){
    // 상세페이지 하단에 자동 추가
    var sections = document.querySelectorAll('.detail-section');
    if(sections.length > 3){
      var fortunes = [
        '오늘 밤은 새로운 인연을 만나기 좋은 날.',
        '분위기 좋은 곳에서 스트레스를 풀어보세요.',
        '오래된 친구와 함께라면 더 즐거운 밤.',
        '오늘은 새로운 곳을 탐험해볼 때.',
        '좋은 음악이 기다리고 있습니다.',
        '금요일의 에너지를 온몸으로 느껴보세요.',
        '오늘 밤은 특별한 일이 생길 예감.',
        '가까운 곳에 숨겨진 명소가 있습니다.'
      ];
      var dayIdx = new Date().getDate() + new Date().getMonth()*31;
      var fortune = fortunes[dayIdx % fortunes.length];
      var fortuneDiv = document.createElement('div');
      fortuneDiv.style.cssText = 'padding:20px;margin:0 20px 16px;background:linear-gradient(135deg,#F8F7FF,#F0FDFA);border:1px solid #E5E7EB;border-radius:16px;text-align:center;';
      fortuneDiv.innerHTML = '<div style="font-size:24px;margin-bottom:6px;">🔮</div><div style="font-size:13px;color:#555;margin-bottom:4px;">오늘의 밤 운세</div><div style="font-size:15px;font-weight:700;color:#111;">'+fortune+'</div>';
      var targetSection = sections[Math.min(3,sections.length-1)];
      targetSection.parentNode.insertBefore(fortuneDiv, targetSection);
    }
  }

  // ══════════ [11] 탐색 카운터 — 페이지 하단 ══════════
  var footer = document.querySelector('.footer, .detail-footer');
  if(footer){
    var counter = document.createElement('div');
    counter.style.cssText = 'padding:12px;text-align:center;font-size:13px;color:#555;border-top:1px solid #E5E7EB;';
    counter.innerHTML = '📊 '+exploredCount+'/'+totalVenues+'곳 탐색 ('+explorePercent+'%) · '+level.icon+' '+level.name+' · 🔥'+streak+'일 연속';
    footer.parentNode.insertBefore(counter, footer);
  }

  // ══════════ [12] 첫 방문 환영 메시지 ══════════
  if(visits <= 1){
    setTimeout(function(){showToast('👋 밤키에 오신 걸 환영합니다! 업소를 탐색하면 XP를 받아요');},2000);
  } else if(streak >= 3){
    setTimeout(function(){showToast('🔥 '+streak+'일 연속 방문! 대단해요');},2000);
  }

  // ══════════ [13] "이 페이지의 비밀" — 스크롤 70%에서 공개 ══════════
  var secretShown = false;
  var detailBody = document.querySelectorAll('.detail-body');
  if(detailBody.length > 0){
    var secretDiv = document.createElement('div');
    secretDiv.style.cssText = 'margin:20px;padding:20px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:16px;text-align:center;filter:blur(8px);transition:filter .5s;';
    secretDiv.innerHTML = '<div style="font-size:20px;margin-bottom:6px;">🔐</div><div style="font-size:16px;font-weight:800;color:#111;margin-bottom:4px;">이 업소의 숨겨진 팁</div><div style="font-size:14px;color:#555;">스크롤하면 공개됩니다...</div>';
    var lastBody = detailBody[detailBody.length-1];
    lastBody.parentNode.insertBefore(secretDiv, lastBody.nextSibling);

    window.addEventListener('scroll',function(){
      if(secretShown) return;
      var rect = secretDiv.getBoundingClientRect();
      if(rect.top < window.innerHeight * 0.8){
        secretShown = true;
        secretDiv.style.filter = 'none';
        var tips = [
          '주중 화~목이 가장 여유롭고 서비스도 좋습니다.',
          '밤 10시 전에 도착하면 좋은 자리를 잡기 쉽습니다.',
          '웨이터에게 먼저 인사하면 밤의 질이 달라집니다.',
          '단체 예약은 최소 3일 전이 안전합니다.',
          '첫 방문이라면 입구에서 웨이터 안내를 받으세요.',
          '주차보다 대중교통이나 대리운전을 추천합니다.'
        ];
        var tip = tips[(new Date().getDate() + pageViews) % tips.length];
        secretDiv.innerHTML = '<div style="font-size:20px;margin-bottom:6px;">💡</div><div style="font-size:16px;font-weight:800;color:#111;margin-bottom:4px;">숨겨진 팁 발견! +10XP</div><div style="font-size:14px;color:#333;">'+tip+'</div>';
        xp += 10;
        set('xp',xp);
        showToast('💡 숨겨진 팁 발견! +10XP');
      }
    });
  }

  // ══════════ [14] 무한 콘텐츠 — "더 읽을거리" 자동 추가 ══════════
  var readMore = [
    {title:'드레스코드 체커로 입장 가능한지 확인하기',url:'/interactive/dresscode.html'},
    {title:'나에게 맞는 밤문화 유형 테스트',url:'/interactive/quiz.html'},
    {title:'음주 계산기로 안전하게',url:'/interactive/safety.html'},
    {title:'N빵 계산기',url:'/community/calculator.html'},
    {title:'밤문화 팁 · 노하우',url:'/community/tips.html'},
    {title:'전국 업소 지도',url:'/map/'},
    {title:'인기 TOP 20 랭킹',url:'/ranking/'},
    {title:'매거진 — 강남 vs 홍대',url:'/magazine/'},
    {title:'이번 주 이벤트',url:'/events/'},
    {title:'패션 · 드레스코드 가이드',url:'/community/fashion.html'}
  ];
  var largeCta = document.querySelector('.large-cta');
  if(largeCta){
    var moreDiv = document.createElement('div');
    moreDiv.style.cssText = 'padding:20px 16px;';
    var shuffled = readMore.sort(function(){return 0.5-Math.random();}).slice(0,4);
    moreDiv.innerHTML = '<h3 style="font-size:17px;font-weight:800;color:#111;margin-bottom:12px;display:flex;align-items:center;gap:6px;">📚 더 읽을거리</h3>'+
      shuffled.map(function(r){
        return '<a href="'+r.url+'" target="_blank" rel="noopener noreferrer" style="display:block;padding:12px 16px;margin-bottom:6px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;text-decoration:none;color:#111;font-size:14px;font-weight:600;transition:background .2s;">'+r.title+' &rarr;</a>';
      }).join('');
    largeCta.parentNode.insertBefore(moreDiv, largeCta);
  }
})();
