export default {
  pages: [
    'pages/question/index',
    'pages/profile/index',
    'pages/wrongAnswers/index',
    'pages/statistics/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#007AFF',
    navigationBarTitleText: '软考刷题王',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F2F2F7'
  },
  tabBar: {
    custom: false,
    color: '#8E8E93',
    selectedColor: '#007AFF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    position: 'bottom',
    list: [
      {
        pagePath: 'pages/question/index',
        text: '刷题',
        iconPath: 'assets/icons/question.png',
        selectedIconPath: 'assets/icons/question-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png'
      }
    ]
  },
  lazyCodeLoading: 'requiredComponents'
}