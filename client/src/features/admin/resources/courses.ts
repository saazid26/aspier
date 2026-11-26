export const coursesResource={name:'courses',title:'Courses',endpoint:'/admin/courses',fields:[
  {name:'title',label:'Title'},
  {name:'slug',label:'Slug'},
  {name:'description',label:'Course overview and syllabus',type:'richtext'},
  {name:'duration',label:'Duration'},
  {name:'mode',label:'Delivery Mode',type:'select',options:[
    ['Online and Recorded','Online and Recorded'],
    ['Online and Live','Online and Live'],
    ['In-Person Workshop','In-Person Workshop']
  ]},
  {name:'startDate',label:'Course Start Date',type:'date'},
  {name:'targetAudience',label:'Target audience',type:'richtext'},
  {name:'enrollmentContact',label:'Enrollment / contact CTA'},
  {name:'wingId',label:'Wing ID'},
  {name:'instructorId',label:'Instructor ID'},
  {name:'price',label:'Fee (BDT)',type:'number'},
  {name:'thumbnail',label:'Course snippet thumbnail / detail banner',type:'image',imageHelp:'Recommended: 800 × 450 px • 16:9 Ratio • Max 2MB',maxSizeMB:2,imageVariant:'cover'},
  {name:'level',label:'Level'},
  {name:'status',label:'Status'},
  {name:'sampleData',label:'Illustrative sample course',type:'boolean'}
]};
