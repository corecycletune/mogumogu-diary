// Tiny vector UI stamps; card artwork and stamp eligibility remain unchanged.
(function(){
  const decorations={
    ordinary:'<path d="M26 14q6-8 12 0" fill="none" stroke="#cf9558" stroke-width="3" stroke-linecap="round"/>',
    habit:'<path d="M32 20V9" stroke="#668e4c" stroke-width="3" stroke-linecap="round"/><path d="M32 14Q15 16 18 4q13-1 14 10M32 10Q34-1 47 4q-1 12-15 6" fill="#a0c779" stroke="#668e4c" stroke-width="2"/>',
    month:'<path d="m32 2 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffe285" stroke="#c6903d" stroke-width="2" stroke-linejoin="round"/>',
    'habit-month':'<path d="m24 4-6 9 14 14 14-14-6-9z" fill="#a8e0eb" stroke="#559eb2" stroke-width="2" stroke-linejoin="round"/><path d="M18 13h28M24 4l8 23 8-23" fill="none" stroke="#fff" stroke-width="2"/>',
    century:'<path d="m19 19-2-15 9 7 6-10 6 10 9-7-2 15z" fill="#ffda74" stroke="#b98540" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="14" r="2.5" fill="#ec8e78"/>'
  };
  window.MogumoguStampArt=function(type){
    const colors={ordinary:'#efd8b4',habit:'#d7e9be',month:'#ffe4a4','habit-month':'#c7e7ee',century:'#ead9f1'};
    return '<svg class="stamp-illustration" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="32" cy="34" r="28" fill="'+(colors[type]||colors.ordinary)+'"/><path d="M12 45c-1-11 9-27 20-27s21 16 20 27c-1 10-13 14-20 14S13 55 12 45Z" fill="#fffcf2" stroke="#ae8356" stroke-width="2.5"/><path d="M25 46q7-7 14 0v11H25Z" fill="#71946a"/><ellipse cx="21" cy="43" rx="5" ry="3" fill="#f3b3a0"/><ellipse cx="43" cy="43" rx="5" ry="3" fill="#f3b3a0"/><path d="M23 37q2-3 4 0m10 0q2-3 4 0m-12 4q3 4 6 0" fill="none" stroke="#785039" stroke-width="2.5" stroke-linecap="round"/>'+(decorations[type]||decorations.ordinary)+'</svg>';
  };
})();
