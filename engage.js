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
    {sec:600, msg:'👑 10분! +50XP — 놀쿨 마스터 등극', xp:50, done:false}
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
    setTimeout(function(){showToast('👋 놀쿨에 오신 걸 환영합니다! 업소를 탐색하면 XP를 받아요');},2000);
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

  // ══════════ [15] "오늘 N명이 봤습니다" 실시간 카운터 ══════════
  var viewKey = 'views_'+today+'_'+(slug||'home');
  var viewCount = get(viewKey, Math.floor(Math.random()*80)+40);
  viewCount++;
  set(viewKey, viewCount);
  var viewBanner = document.createElement('div');
  viewBanner.style.cssText = 'padding:8px 16px;text-align:center;font-size:13px;color:#8B5CF6;font-weight:600;background:#F8F7FF;border-bottom:1px solid #E5E7EB;';
  viewBanner.innerHTML = '👀 오늘 <strong>'+viewCount+'명</strong>이 이 페이지를 봤습니다';
  var heroEl = document.querySelector('.detail-hero, .hero');
  if(heroEl && heroEl.nextSibling) heroEl.parentNode.insertBefore(viewBanner, heroEl.nextSibling);

  // ══════════ [16] 희소성 트리거 — 스크롤 60%에서 "소수만 본 정보" ══════════
  var scarcityShown = false;
  window.addEventListener('scroll',function(){
    if(scarcityShown) return;
    var p = (window.scrollY+window.innerHeight)/document.documentElement.scrollHeight;
    if(p>0.6){
      scarcityShown = true;
      var secretNum = Math.floor(Math.random()*5)+2;
      showToast('🔒 여기까지 스크롤한 사람은 오늘 '+secretNum+'명뿐입니다');
    }
  });

  // ══════════ [17] 읽기시간 표시 ══════════
  var bodyText = document.body.innerText || '';
  var charCount = bodyText.replace(/\s/g,'').length;
  var readMin = Math.max(2, Math.ceil(charCount / 500));
  var readBadge = document.createElement('div');
  readBadge.style.cssText = 'padding:6px 16px;font-size:12px;color:#555;text-align:center;';
  readBadge.innerHTML = '📖 읽기 약 '+readMin+'분 · '+charCount.toLocaleString()+'자';
  if(heroEl && viewBanner.nextSibling) viewBanner.parentNode.insertBefore(readBadge, viewBanner.nextSibling);

  // ══════════ [18] 스크롤 애니메이션 — 요소가 화면에 들어올 때 페이드인 ══════════
  var animStyle = document.createElement('style');
  animStyle.textContent = '.engage-fade{opacity:0;transform:translateY(24px);transition:opacity .5s,transform .5s;}.engage-fade.visible{opacity:1;transform:translateY(0);}';
  document.head.appendChild(animStyle);
  var animTargets = document.querySelectorAll('.detail-section, .plan-card, .faq-item, .cta-box, .premium-card, .card');
  animTargets.forEach(function(el){ el.classList.add('engage-fade'); });
  if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    },{threshold:0.15});
    animTargets.forEach(function(el){ obs.observe(el); });
  } else {
    animTargets.forEach(function(el){ el.classList.add('visible'); });
  }

  // ══════════ [19] 넷플릭스 카운트다운 — 다음 업소 자동 전환 (상세페이지만) ══════════
  var isDetailPage = window.location.pathname.indexOf('/v/') === 0;
  if(isDetailPage){
    // 모든 업소 슬러그 목록 (링크에서 추출)
    var allLinks = [];
    try {
      var stored = get('allSlugs',[]);
      if(stored.length > 5) allLinks = stored;
    } catch(e){}

    // 추천 업소 3개 선정 (랜덤)
    var recSlugs = [];
    if(allLinks.length > 3){
      var shuffledSlugs = allLinks.filter(function(s){return s!==slug;}).sort(function(){return 0.5-Math.random();});
      recSlugs = shuffledSlugs.slice(0,3);
    }

    // "여기 방문한 사람들이 다음으로 간 곳" 섹션
    var similarSection = document.querySelector('.similar-section');
    if(similarSection && recSlugs.length >= 3){
      var alsoVisited = document.createElement('div');
      alsoVisited.style.cssText = 'padding:16px 20px;';
      alsoVisited.innerHTML = '<p style="font-size:15px;font-weight:800;color:#111;margin-bottom:10px;display:flex;align-items:center;gap:6px;">🔥 여기 본 사람들이 다음으로 간 곳</p>'+
        recSlugs.map(function(s){
          var name = s.replace(/-/g,' ');
          return '<a href="/v/'+s+'/" style="display:block;padding:12px 16px;margin-bottom:6px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;text-decoration:none;color:#111;font-size:14px;font-weight:600;">'+name+' &rarr;</a>';
        }).join('');
      similarSection.parentNode.insertBefore(alsoVisited, similarSection.nextSibling);
    }

    // 넷플릭스 스타일 카운트다운 (페이지 하단 도달시)
    var countdownShown = false;
    window.addEventListener('scroll',function(){
      if(countdownShown || recSlugs.length < 1) return;
      var p = (window.scrollY+window.innerHeight)/document.documentElement.scrollHeight;
      if(p > 0.92){
        countdownShown = true;
        var nextSlug = recSlugs[0];
        var nextName = nextSlug.replace(/-/g,' ');
        var cdDiv = document.createElement('div');
        cdDiv.style.cssText = 'position:fixed;bottom:72px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:448px;background:#111;color:#fff;border-radius:16px;padding:16px 20px;z-index:850;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
        cdDiv.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'+
          '<span style="font-size:13px;color:#999;">다음 업소로 이동</span>'+
          '<button id="cdCancel" style="background:none;border:none;color:#999;font-size:18px;cursor:pointer;padding:4px 8px;min-height:44px;min-width:44px;">&times;</button>'+
          '</div>'+
          '<div style="font-size:16px;font-weight:800;margin-bottom:10px;">'+nextName+'</div>'+
          '<div style="height:3px;background:#333;border-radius:2px;overflow:hidden;">'+
          '<div id="cdBar" style="height:100%;background:linear-gradient(90deg,#8B5CF6,#06B6D4);width:100%;transition:width 10s linear;"></div>'+
          '</div>'+
          '<div style="font-size:12px;color:#999;margin-top:6px;" id="cdTime">10초 후 이동...</div>';
        document.body.appendChild(cdDiv);

        // 프로그레스바 애니메이션
        setTimeout(function(){ document.getElementById('cdBar').style.width='0%'; },100);

        var cdSec = 10;
        var cdTimer = setInterval(function(){
          cdSec--;
          var cdTimeEl = document.getElementById('cdTime');
          if(cdTimeEl) cdTimeEl.textContent = cdSec+'초 후 이동...';
          if(cdSec <= 0){
            clearInterval(cdTimer);
            window.location.href = '/v/'+nextSlug+'/';
          }
        },1000);

        // 취소 버튼
        document.getElementById('cdCancel').addEventListener('click',function(){
          clearInterval(cdTimer);
          cdDiv.remove();
          showToast('이동 취소됨');
        });
      }
    });
  }

  // ══════════ [20] VS 투표 (상세페이지) ══════════
  if(isDetailPage && document.querySelector('.detail-section')){
    var vsNames = [
      '강남 vs 홍대','라운지 vs 클럽','소규모 vs 대형','밴드 vs DJ',
      '금요일 vs 토요일','캐주얼 vs 드레시','2차 vs 올인원','서울 vs 부산'
    ];
    var vsIdx = (new Date().getDate() + pageViews) % vsNames.length;
    var vsPair = vsNames[vsIdx].split(' vs ');
    var vsDiv = document.createElement('div');
    vsDiv.style.cssText = 'margin:16px 20px;padding:20px;background:linear-gradient(135deg,#F8F7FF,#FFF7ED);border:1px solid #E5E7EB;border-radius:16px;text-align:center;';
    var vsVoted = get('vs_'+vsIdx, '');
    if(!vsVoted){
      vsDiv.innerHTML =
        '<div style="font-size:20px;margin-bottom:8px;">⚔️</div>'+
        '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:12px;">오늘의 VS 대결</div>'+
        '<div style="display:flex;gap:8px;">'+
        '<button class="vs-btn" data-pick="A" style="flex:1;padding:14px;background:#8B5CF6;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;min-height:44px;">'+vsPair[0]+'</button>'+
        '<button class="vs-btn" data-pick="B" style="flex:1;padding:14px;background:#06B6D4;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;min-height:44px;">'+vsPair[1]+'</button>'+
        '</div>';
    } else {
      var aVotes = get('vs_a_'+vsIdx, Math.floor(Math.random()*40)+30);
      var bVotes = get('vs_b_'+vsIdx, Math.floor(Math.random()*40)+30);
      var total = aVotes+bVotes;
      vsDiv.innerHTML = '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:8px;">⚔️ '+vsPair[0]+' vs '+vsPair[1]+'</div>'+
        '<div style="display:flex;height:32px;border-radius:8px;overflow:hidden;font-size:13px;font-weight:700;">'+
        '<div style="width:'+Math.round(aVotes/total*100)+'%;background:#8B5CF6;color:#fff;display:flex;align-items:center;justify-content:center;">'+Math.round(aVotes/total*100)+'%</div>'+
        '<div style="width:'+Math.round(bVotes/total*100)+'%;background:#06B6D4;color:#fff;display:flex;align-items:center;justify-content:center;">'+Math.round(bVotes/total*100)+'%</div>'+
        '</div>';
    }
    var faqSection = null;
    var allSections = document.querySelectorAll('.detail-section');
    for(var si=0;si<allSections.length;si++){
      if(allSections[si].querySelector('.faq-item')){faqSection=allSections[si];break;}
    }
    if(faqSection) faqSection.parentNode.insertBefore(vsDiv, faqSection);

    // VS 투표 클릭 핸들러
    vsDiv.addEventListener('click',function(e){
      var btn = e.target.closest('.vs-btn');
      if(!btn) return;
      var pick = btn.getAttribute('data-pick');
      set('vs_'+vsIdx, pick);
      var aV = get('vs_a_'+vsIdx, Math.floor(Math.random()*40)+30);
      var bV = get('vs_b_'+vsIdx, Math.floor(Math.random()*40)+30);
      if(pick==='A') aV++; else bV++;
      set('vs_a_'+vsIdx, aV);
      set('vs_b_'+vsIdx, bV);
      var tot = aV+bV;
      vsDiv.innerHTML = '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:8px;">⚔️ '+vsPair[0]+' vs '+vsPair[1]+'</div>'+
        '<div style="display:flex;height:32px;border-radius:8px;overflow:hidden;font-size:13px;font-weight:700;">'+
        '<div style="width:'+Math.round(aV/tot*100)+'%;background:#8B5CF6;color:#fff;display:flex;align-items:center;justify-content:center;">'+Math.round(aV/tot*100)+'%</div>'+
        '<div style="width:'+Math.round(bV/tot*100)+'%;background:#06B6D4;color:#fff;display:flex;align-items:center;justify-content:center;">'+Math.round(bV/tot*100)+'%</div>'+
        '</div>';
      xp += 10;
      set('xp',xp);
      showToast('⚔️ 투표 완료! +10XP');
    });
  }

  // ══════════ [21] 퀴즈 — "나에게 맞는 밤문화는?" (상세페이지 인라인) ══════════
  if(isDetailPage){
    var quizData = [
      {q:'밤에 나가면 가장 먼저 하는 건?',a:['음악에 몸 맡기기','조용히 술 한잔','새로운 사람 만나기'],r:['클럽이 딱!','라운지 추천!','나이트가 맞아!']},
      {q:'선호하는 분위기는?',a:['화려한 조명+EDM','은은한 재즈+칵테일','라이브 밴드+댄스'],r:['클럽으로!','라운지로!','나이트로!']},
      {q:'함께 가는 인원은?',a:['혼자 또는 2명','3~5명 소그룹','10명 이상 단체'],r:['라운지 추천!','클럽이나 나이트!','룸이 딱!']},
      {q:'가장 중요한 건?',a:['음악 퀄리티','프라이버시','가성비'],r:['클럽으로!','룸이 딱!','나이트 추천!']}
    ];
    var qIdx = (new Date().getDate() + new Date().getHours()) % quizData.length;
    var quiz = quizData[qIdx];
    var quizAnswered = get('quiz_'+qIdx,'');
    var quizDiv = document.createElement('div');
    quizDiv.style.cssText = 'margin:16px 20px;padding:20px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:16px;text-align:center;';

    if(!quizAnswered){
      quizDiv.innerHTML = '<div style="font-size:20px;margin-bottom:6px;">🎯</div>'+
        '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:12px;">'+quiz.q+'</div>'+
        quiz.a.map(function(a,i){
          return '<button class="quiz-btn" data-idx="'+i+'" style="display:block;width:100%;padding:12px;margin-bottom:6px;background:#fff;border:1px solid #D1D5DB;border-radius:10px;font-size:14px;font-weight:600;color:#111;cursor:pointer;font-family:inherit;min-height:44px;transition:all .2s;">'+a+'</button>';
        }).join('');
    } else {
      var rIdx = parseInt(quizAnswered);
      quizDiv.innerHTML = '<div style="font-size:20px;margin-bottom:6px;">🎯</div>'+
        '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px;">당신의 결과</div>'+
        '<div style="font-size:16px;font-weight:700;color:#22C55E;">'+quiz.r[rIdx]+'</div>';
    }

    // FAQ 전에 삽입
    var vsEl = document.querySelector('[style*="linear-gradient(135deg,#F8F7FF,#FFF7ED)"]');
    if(vsEl) vsEl.parentNode.insertBefore(quizDiv, vsEl);
    else if(faqSection) faqSection.parentNode.insertBefore(quizDiv, faqSection);

    quizDiv.addEventListener('click',function(e){
      var btn = e.target.closest('.quiz-btn');
      if(!btn) return;
      var idx = parseInt(btn.getAttribute('data-idx'));
      set('quiz_'+qIdx, String(idx));
      quizDiv.innerHTML = '<div style="font-size:20px;margin-bottom:6px;">🎯</div>'+
        '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px;">당신의 결과</div>'+
        '<div style="font-size:16px;font-weight:700;color:#22C55E;">'+quiz.r[idx]+'</div>';
      xp += 15;
      set('xp',xp);
      showToast('🎯 퀴즈 완료! +15XP');
    });
  }

  // ══════════ [22] 스와이프 갤러리 플레이스홀더 (상세페이지) ══════════
  if(isDetailPage){
    var galleryEmojis = ['🌃','🍸','🎵','🎤','💃','🕺'];
    var galleryDiv = document.createElement('div');
    galleryDiv.style.cssText = 'margin:16px 0;overflow:hidden;';
    galleryDiv.innerHTML =
      '<div style="padding:0 20px 8px;font-size:15px;font-weight:800;color:#111;">📸 갤러리</div>'+
      '<div id="swipeGallery" style="display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:0 20px 12px;scrollbar-width:none;">'+
      galleryEmojis.map(function(e,i){
        var colors = ['#8B5CF6','#06B6D4','#F59E0B','#EF4444','#22C55E','#6366F1'];
        return '<div style="flex-shrink:0;width:200px;height:150px;background:'+colors[i]+';border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:48px;scroll-snap-align:start;color:#fff;">'+e+'</div>';
      }).join('')+
      '</div>'+
      '<div style="display:flex;justify-content:center;gap:4px;padding:4px 0;" id="galleryDots">'+
      galleryEmojis.map(function(_,i){
        return '<div style="width:6px;height:6px;border-radius:50%;background:'+(i===0?'#8B5CF6':'#D1D5DB')+';transition:background .2s;"></div>';
      }).join('')+
      '</div>';

    // 히어로 아래에 삽입
    var detailHero = document.querySelector('.detail-hero');
    if(detailHero){
      var insertPoint = readBadge && readBadge.parentNode ? readBadge.nextSibling : detailHero.nextSibling;
      if(insertPoint) detailHero.parentNode.insertBefore(galleryDiv, insertPoint.nextSibling || null);
      else detailHero.parentNode.appendChild(galleryDiv);
    }

    // 스와이프 도트 인디케이터 업데이트
    var swipeEl = document.getElementById('swipeGallery');
    if(swipeEl){
      swipeEl.addEventListener('scroll',function(){
        var dots = document.querySelectorAll('#galleryDots div');
        var idx = Math.round(swipeEl.scrollLeft / 208);
        dots.forEach(function(d,i){ d.style.background = i===idx ? '#8B5CF6' : '#D1D5DB'; });
      });
      // 스와이프 스크롤바 숨기기
      var galStyle = document.createElement('style');
      galStyle.textContent = '#swipeGallery::-webkit-scrollbar{display:none;}';
      document.head.appendChild(galStyle);
    }
  }

  // ══════════ [23] 슬러그 목록 수집 (다음 업소 추천용) ══════════
  var cardLinks = document.querySelectorAll('a[href*="/v/"]');
  var slugList = [];
  cardLinks.forEach(function(a){
    var match = a.href.match(/\/v\/([^/]+)\/?/);
    if(match && slugList.indexOf(match[1])<0) slugList.push(match[1]);
  });
  if(slugList.length > 5) set('allSlugs', slugList);

  // ══════════ [24] "이 업소의 비밀" — 스크롤 80%에서 모달 ══════════
  var secretModalShown = false;
  if(isDetailPage){
    window.addEventListener('scroll',function(){
      if(secretModalShown) return;
      var p = (window.scrollY+window.innerHeight)/document.documentElement.scrollHeight;
      if(p>0.8){
        secretModalShown = true;
        var secrets = [
          '웨이터에게 "추천해주세요"라고 말하면 특별 서비스를 받을 수 있어요.',
          '금요일보다 목요일이 분위기가 더 좋은 경우가 많아요.',
          '오픈 직후(PM 8~9시)에 가면 좋은 자리를 먼저 잡을 수 있어요.',
          '단골이 되면 예약 없이도 좋은 자리로 안내받아요.',
          '생일이라고 미리 말하면 서프라이즈를 해주는 곳도 있어요.',
          '막판에 남은 VIP석을 할인받을 수 있는 경우도 있어요.'
        ];
        var sIdx = (new Date().getDate() + new Date().getHours()) % secrets.length;
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML =
          '<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:360px;width:100%;text-align:center;animation:slideIn .3s ease;">'+
          '<div style="font-size:32px;margin-bottom:12px;">🤫</div>'+
          '<div style="font-size:18px;font-weight:900;color:#111;margin-bottom:12px;">이 업소의 비밀</div>'+
          '<div style="font-size:15px;color:#333;line-height:1.7;margin-bottom:16px;">'+secrets[sIdx]+'</div>'+
          '<button id="secretClose" style="padding:12px 32px;background:#8B5CF6;color:#fff;border:none;border-radius:999px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;min-height:44px;">확인 +15XP</button>'+
          '</div>';
        document.body.appendChild(modal);
        modal.addEventListener('click',function(e){
          if(e.target === modal || e.target.id === 'secretClose'){
            modal.remove();
            xp += 15;
            set('xp',xp);
            showToast('🤫 비밀 발견! +15XP');
          }
        });
      }
    });
  }

  // ══════════ [25] 스크롤 진행률 퍼센트 표시 ══════════
  var pctLabel = document.createElement('div');
  pctLabel.id = 'scrollPct';
  pctLabel.style.cssText = 'position:fixed;top:6px;right:12px;font-size:11px;font-weight:700;color:#8B5CF6;z-index:10000;opacity:0;transition:opacity .3s;';
  document.body.appendChild(pctLabel);
  var pctTimer;
  window.addEventListener('scroll',function(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h>0 ? Math.round((window.scrollY/h)*100) : 0;
    pctLabel.textContent = p+'%';
    pctLabel.style.opacity = '1';
    clearTimeout(pctTimer);
    pctTimer = setTimeout(function(){ pctLabel.style.opacity = '0'; },2000);
  });

})();
